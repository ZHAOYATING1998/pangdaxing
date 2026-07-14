// 简化的 404 页面 — 不依赖妙搭 SDK
const NotFound = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 72, margin: 0, color: '#2563eb' }}>404</h1>
      <p style={{ fontSize: 18, color: '#6b7280' }}>页面走丢啦~</p>
      <a href="/" style={{ marginTop: 16, color: '#2563eb', textDecoration: 'none' }}>
        返回首页
      </a>
    </div>
  );
};

export default NotFound;
