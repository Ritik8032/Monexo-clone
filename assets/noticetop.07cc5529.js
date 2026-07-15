const noticetop = {
  name: 'noticetop',
  data() {
    return {
      text: "Notice: Please do not modify or cancel orders without proper verification to ensure secure trading."
    };
  },
  render(h) {
    return h('div', {
      style: {
        background: '#fffbeb',
        color: '#b45309',
        padding: '10px 16px',
        fontSize: '12px',
        textAlign: 'center',
        borderBottom: '1px solid #fde68a',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }
    }, [
      h('span', { style: { fontSize: '14px' } }, '⚠️'),
      h('span', this.text)
    ]);
  }
};

export default noticetop;
