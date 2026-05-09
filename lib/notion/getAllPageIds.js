
export default function getAllPageIds (collectionQuery, collectionId, collectionView, viewIds) {
  if (!collectionQuery && !collectionView) {
    return []
  }
  let pageIds = []
  if (collectionQuery && Object.values(collectionQuery).length > 0) {
    const pageSet = new Set()
    Object.values(collectionQuery[collectionId] || {}).forEach(view => {
      view?.blockIds?.forEach(id => pageSet.add(id)) // group视图
      view?.collection_group_results?.blockIds?.forEach(id => pageSet.add(id)) // table视图
    })
    pageIds = [...pageSet]
  }
  // 兜底：若 collectionQuery 未解析到任何 pageId，则回退到 collection_view 的 page_sort，
  // 否则首页等页面会出现 allPages=[]、posts=[] 而归档页恰好命中可用响应的情况。
  if (pageIds.length === 0 && viewIds && viewIds.length > 0 && collectionView) {
    const ids = collectionView[viewIds[0]]?.value?.page_sort
    if (Array.isArray(ids)) {
      for (const id of ids) {
        pageIds.push(id)
      }
    }
  }
  return pageIds
}
