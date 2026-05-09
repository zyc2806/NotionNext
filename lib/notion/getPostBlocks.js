import BLOG from '@/blog.config'
import { NotionAPI } from 'notion-client'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import { deepClone, delay } from '../utils'

export async function getPostBlocks(id, from, slice) {
  const cacheKey = 'page_block_' + id
  let pageBlock = await getDataFromCache(cacheKey)
  if (pageBlock) {
    console.log('[命中缓存]:', `from:${from}`, cacheKey)
    return filterPostBlocks(id, pageBlock, slice)
  }

  const start = new Date().getTime()
  pageBlock = await getPageWithRetry(id, from)
  const end = new Date().getTime()
  console.log('[API耗时]', `${end - start}ms`)

  if (pageBlock) {
    await setDataToCache(cacheKey, pageBlock)
    return filterPostBlocks(id, pageBlock, slice)
  }
  return pageBlock
}

// Notion 私有 API 在新版响应中给 record map 多嵌了一层 `value`；
// notion-client 6.15.6 自带的 getPage 在 fetchCollections 阶段会按旧格式
// 读取 block.value.type，因此识别不出 collection_view，进而不去 fetch 数据库内容。
// 这里手动复刻 getPage 的流程：先取 raw、unwrap、再用 unwrap 后的视图信息
// 调 getCollectionData 拉取每个数据库的真实条目。
function unwrapDoubleValue(record) {
  if (!record) return record
  for (const id in record) {
    const w = record[id]
    if (w && w.value && w.value.value && typeof w.value.value === 'object') {
      w.value = w.value.value
    }
  }
  return record
}

async function getPageWithCollections(api, id) {
  const raw = await api.getPageRaw(id)
  const rm = raw?.recordMap
  if (!rm) return null
  rm.collection = rm.collection || {}
  rm.collection_view = rm.collection_view || {}
  rm.collection_query = {}
  rm.signed_urls = {}
  unwrapDoubleValue(rm.block)
  unwrapDoubleValue(rm.collection)
  unwrapDoubleValue(rm.collection_view)

  for (const blockId in rm.block) {
    const v = rm.block[blockId]?.value
    if (!v) continue
    if (v.type !== 'collection_view' && v.type !== 'collection_view_page') continue
    const collectionId = v.collection_id || v.format?.collection_pointer?.id
    const viewIds = v.view_ids || []
    for (const vid of viewIds) {
      const viewInfo = rm.collection_view[vid]?.value
      if (!collectionId || !viewInfo) continue
      try {
        const data = await api.getCollectionData(collectionId, vid, viewInfo)
        if (data?.recordMap?.block) {
          rm.block = { ...rm.block, ...data.recordMap.block }
          unwrapDoubleValue(rm.block)
        }
        if (data?.recordMap?.collection) {
          rm.collection = { ...rm.collection, ...data.recordMap.collection }
          unwrapDoubleValue(rm.collection)
        }
        if (data?.recordMap?.collection_view) {
          rm.collection_view = { ...rm.collection_view, ...data.recordMap.collection_view }
          unwrapDoubleValue(rm.collection_view)
        }
        rm.collection_query[collectionId] = {
          ...rm.collection_query[collectionId],
          [vid]: data?.result?.reducerResults
        }
      } catch (e) {
        console.warn('[getCollectionData 失败]', collectionId, vid, e.message)
      }
    }
  }
  return rm
}

/**
 * 调用接口，失败会重试
 * @param {*} id
 * @param {*} retryAttempts
 */
export async function getPageWithRetry(id, from, retryAttempts = 3) {
  if (retryAttempts && retryAttempts > 0) {
    console.log('[请求API]', `from:${from}`, `id:${id}`, retryAttempts < 3 ? `剩余重试次数:${retryAttempts}` : '')
    try {
      const authToken = BLOG.NOTION_ACCESS_TOKEN || null
      const api = new NotionAPI({ authToken, userTimeZone: 'Asia/ShangHai' })
      const pageData = await getPageWithCollections(api, id)
      console.info('[响应成功]:', `from:${from}`)
      return pageData
    } catch (e) {
      console.warn('[响应异常]:', e)
      await delay(1000)
      const cacheKey = 'page_block_' + id
      const pageBlock = await getDataFromCache(cacheKey)
      if (pageBlock) {
        console.log('[重试缓存]', `from:${from}`, `id:${id}`)
        return pageBlock
      }
      return await getPageWithRetry(id, from, retryAttempts - 1)
    }
  } else {
    console.error('[请求失败]:', `from:${from}`, `id:${id}`)
    return null
  }
}

/**
 * 获取到的blockMap删除不需要的字段
 * @param {*} id 页面ID
 * @param {*} pageBlock 页面元素
 * @param {*} slice 截取数量
 * @returns
 */
function filterPostBlocks(id, pageBlock, slice) {
  const clonePageBlock = deepClone(pageBlock)
  unwrapDoubleValue(clonePageBlock?.block)
  unwrapDoubleValue(clonePageBlock?.collection)
  unwrapDoubleValue(clonePageBlock?.collection_view)
  let count = 0

  for (const i in clonePageBlock?.block) {
    const b = clonePageBlock?.block[i]
    if (slice && slice > 0 && count > slice) {
      delete clonePageBlock?.block[i]
      continue
    }
    count++
    // 处理 c++、c#、汇编等语言名字映射
    if (b?.value?.type === 'code') {
      if (b?.value?.properties?.language?.[0][0] === 'C++') {
        b.value.properties.language[0][0] = 'cpp'
      }
      if (b?.value?.properties?.language?.[0][0] === 'C#') {
        b.value.properties.language[0][0] = 'csharp'
      }
      if (b?.value?.properties?.language?.[0][0] === 'Assembly') {
        b.value.properties.language[0][0] = 'asm6502'
      }
    }

    delete b?.role
    delete b?.value?.version
    delete b?.value?.created_by_table
    delete b?.value?.created_by_id
    delete b?.value?.last_edited_by_table
    delete b?.value?.last_edited_by_id
    delete b?.value?.space_id
  }

  // 去掉不用的字段
  if (id === BLOG.NOTION_PAGE_ID) {
    return clonePageBlock
  }
  return clonePageBlock
}
