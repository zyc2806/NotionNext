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
      const pageData = await api.getPage(id)
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
// Notion 私有 API 的响应在 2024 之后给每个 block / collection / collection_view 多嵌了一层
// `value`，即 `record[id].value` 是 `{value: {...实际记录}}` 而不是直接的实际记录。
// 此处统一拍平，恢复成下游代码（getNotionData / getPageProperties / react-notion-x）期望的形状。
function unwrapDoubleValue(record) {
  if (!record) return record
  for (const id in record) {
    const wrapper = record[id]
    if (wrapper && wrapper.value && wrapper.value.value && typeof wrapper.value.value === 'object') {
      wrapper.value = wrapper.value.value
    }
  }
  return record
}

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
