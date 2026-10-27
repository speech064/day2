// Vercel 서버리스 함수: 브라우저 대신 Pixabay를 호출해서 API 키가 노출되지 않게 한다.
// 키는 Vercel 환경변수 PIXABAY_API_KEY 에서 읽는다.
module.exports = async (req, res) => {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'PIXABAY_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  const q = String(req.query.q || '').trim().slice(0, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  if (!q) {
    return res.status(400).json({ error: '검색어를 입력하세요.' });
  }

  const url = 'https://pixabay.com/api/?' + new URLSearchParams({
    key,
    q,
    image_type: 'photo',
    per_page: '10',
    page: String(page),
    safesearch: 'true',
  });

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Pixabay 오류 (' + upstream.status + ')' });
    }
    const data = await upstream.json();
    // 같은 검색은 1시간 동안 캐시해서 요청 횟수를 줄인다.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({
      totalHits: data.totalHits,
      hits: data.hits.map(h => ({
        pageURL: h.pageURL,
        webformatURL: h.webformatURL,
        tags: h.tags,
      })),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Pixabay에 연결하지 못했습니다.' });
  }
};
