const NotFound = {
  name: 'NotFound',
  render(h) {
    return h('div', {
      style: {
        textAlign: 'center',
        padding: '100px 20px',
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, [
      h('h1', { style: { fontSize: '72px', color: '#1f01d5', margin: '0 0 10px 0' } }, '404'),
      h('p', { style: { fontSize: '20px', color: '#4b5563', marginBottom: '30px' } }, 'The page you are looking for does not exist.'),
      h('button', {
        style: {
          padding: '12px 24px',
          background: '#1f01d5',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          transition: 'background-color 0.2s'
        },
        on: {
          click: () => {
            this.$router.push('/');
          }
        }
      }, 'Go to Home Page')
    ]);
  }
};

export default NotFound;
