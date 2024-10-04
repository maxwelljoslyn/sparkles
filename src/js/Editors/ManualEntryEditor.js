import m from 'mithril'

const ManualEntryEditor = {
  view: ({ attrs }) => {
    const { state, onchange } = attrs;
    
    return m('div.manual-entry', [
      m('h4', 'Edit Metadata'),
      m('label', [
        'Title',
        m('input', {
          value: state.selected?.title || '',
          oninput: e => onchange('title', e.target.value)
        })
      ]),
      m('label', [
        'Author',
        m('input', {
          value: state.selected?.author || '',
          oninput: e => onchange('author', e.target.value)
        })
      ]),
      m('label', [
        'Year',
        m('input', {
          type: 'number',
          value: state.selected?.year || '',
          oninput: e => onchange('year', e.target.value)
        })
      ]),
      m('label', [
        'ID',
        m('input', {
          value: state.selected?.id || '',
          oninput: e => onchange('id', e.target.value)
        })
      ]),
      m('label', [
        'URL',
        m('input', {
          type: 'url',
          value: state.selected?.url || '',
          oninput: e => onchange('url', e.target.value)
        })
      ]),
      m('label', [
        'Cover',
        m('input', {
          type: 'url',
          value: state.selected?.image || '',
          oninput: e => onchange('image', e.target.value)
        })
      ])
    ])
  }
}

export default ManualEntryEditor
