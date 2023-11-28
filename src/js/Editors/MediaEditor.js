import m from 'mithril'

import Alert from '../Components/Alert'
import { Box } from '../Components/Box'
import { Modal } from '../Components/Modal'
import Rating from '../Components/Rating'
import Proxy from '../Controllers/Proxy'
import Store from '../Models/Store'
import { dateInRFC3339, ratingToStars } from '../utils'

const getStatusForProgress = (options, key) => {
	const progress = options.find(p => p.key == key)
	return progress.title || progress.label
}

const parseQuery = string => {
	const params = /year:([0-9]{4})/g.exec(string.replaceAll(' ', ''))
	if (params && params.length > 1) {
		return {
			query: string.slice(0, string.indexOf('year:')).trim(),
			year: params[1]
		}
	}
	return {
		query: string.trim()
	}
}

const MediaEditor = ({ attrs }) => {
	const postTypes = Store.getSession('post-types') || []

	let state = {
		type: attrs.search?.options?.[0] || null,
		progress: 'finished'
	}

	const buildEntry = () => {
		const rating = ratingToStars(state.rating)
		const rewatched = state.progress == 'finished' && attrs?.type == 'watch' && state.rewatched

		let summary = rewatched ? 'Rewatched' : getStatusForProgress(attrs?.progress, state.progress)
		if (!summary) return Alert.error('invalid "status" selected')

		summary += ` ${state.selected.title}`
		if (attrs?.type == 'watch') {
			summary += ` (${state.selected.year})`
		} else if (attrs?.type == 'read') {
			summary += ` by ${state.selected.author}`
		}
		if (state.progress == 'finished' && rating) {
			summary += ` - ${rating}`
		}
		const image = state.selected.image || state.image

		return {
			type: [ 'h-entry' ],
			properties: {
				summary: [ summary ],
				...(image && { featured: [ image ] }),
				published: [ state.published || dateInRFC3339() ],
				[`${attrs.type}-of`]: [
					{
						'type': [ 'h-cite' ],
						'properties': {
							name: [ state.selected.title ],
							...(image && { photo: [ image ] }),
							...(state.selected.author && { author: [ state.selected.author ]}),
							...(state.selected.id && { uid: [ state.selected.id ] }),
							...(state.selected.url && { url: [ state.selected.url ] }),
							...(state.selected.year && { published: [ state.selected.year ] }),
						}
					}
				],
				// custom properties
				...(state.progress && { progress: [ state.progress ] }),
				...(state.progress == 'finished' && {
					...(state.content && { content: [ state.content ] }),
					...(rating && state.rating > 0 && { rating: [ state.rating ] }),
					...(rewatched && { rewatch: [ state.rewatched === true ] })
				})
			}
		}
	}

	const post = async (e) => {
		e.preventDefault()

		const entry = buildEntry()
		state.submitting = true
		const res = await Proxy.micropub({
			method: 'POST',
			body: entry
		})

		state.submitting = false
		if (res && res.status === 201) {
			if (res.headers.location) {
				m.route.set('/success?url=' + res.headers.location)
			} else {
				Alert.error('location header missing')
			}
		} else if (!res || res.status >= 400) {
			Alert.error(res)
		}
	}

	let timeout, search = []
	const submitSearch = async (e, page) => {
		e && e.preventDefault()

		timeout && clearTimeout(timeout)

		if (!state.search) return
		const params = parseQuery(state.search)
		if (!params || params.query.trim().length < 3) return

		state.searching = true
		state.searched = false
		state.selected = null
		state.page = page || 1

		try {
			const res = await m.request({
				method: 'GET',
				url: '/api/search',
				params: {
					type: state.type,
					page: state.page,
					...params
				}
			})
			search = res?.results || []
			state.totalResults = res?.totalResults || 0
		} catch ({ response }) {
			Alert.error(response && response.error_description)
			search = null
		}

		state.searching = false
		state.searched = true
	}

	const inputChange = async (e) => {
		state.search = e.target.value
		timeout && clearTimeout(timeout)
		timeout = setTimeout(submitSearch, 2000)
	}

	const postType = postTypes.find(item => item.type == attrs?.type)

	return {
		view: () =>
			m(Box, {
				icon: attrs.icon || '',
				title: postType?.name || attrs.title || 'Media'
			}, [
				m('form.input-group', {
					onsubmit: submitSearch
				}, [
					...(attrs.search?.options && attrs.search.options.length > 1 && [
						m('select', {
							oninput: e => state.type = e.target.value,
							value: state.type
						},
						attrs.search.options.map(o => m('option', { value: o }, o)))
					] || []),
					m('input', {
						type: 'text',
						placeholder: attrs.search?.placeholder || 'Search...',
						oninput: e => inputChange(e),
						value: state.search || ''
					})
				]),
				(state.searching || state.searched) && m('div.item-list.text-center', [
					state.searching && m('i.fas.fa-spinner.fa-spin', { 'aria-hidden': 'true' }),
					state.searched && search && search.length > 0 &&
						search.map(md =>
							m('div.item-tile', {
								onclick: () => state.selected = state.selected ? null : md,
								hidden: state.selected && state.selected.url != md.url
							}, m('div.item' + (state.selected && state.selected.url == md.url ? '.selected' : ''), [
								(md.image || state.image) && m('img', { src: md.image || state.image }),
								m('div', [
									m('h4', md.title),
									md.author && m('h5', md.author),
									md.artist && m('h5', md.artist),
									!md.author && md.year && m('h5', md.year)
								])
							]))),
					state.searched && (!search || search.length === 0) && m('div', 'No results found'),
					!state.selected && search && state.totalResults > search.length && m('div.item-pagination', [
						m('button', { disabled: state.page == 1, onclick: e => submitSearch(e, --state.page) }, 'prev'),
						m('button', { disabled: state.totalResults < state.page * 10, onclick: e => submitSearch(e, ++state.page) }, 'next')
					])
				]),
				state.selected && m('form', {
					onsubmit: post
				}, [
					!state.selected.image && m('label', [
						'Thumbnail',
						m('input', {
							type: 'url',
							placeholder: 'https://',
							onchange: e => state.image = e.target.value,
							value: state.image || ''
						})
					]),
					attrs.progress?.length > 1 && m('label', [
						'Status',
						m('select', {
							oninput: e => state.progress = e.target.value,
							value: state.progress = state.progress
						}, attrs.progress?.map(({key, label}) => m('option', { value: key }, label)))
					]),
					state.progress == 'finished' && [
						m('label', [
							`${attrs.progress?.find(p => p.key == 'finished').label || ''} on`,
							m('input', {
								type: 'date',
								onchange: e => state.published = e.target.value,
								value: state.published || dateInRFC3339()
							})
						]),
						attrs.type == 'watch' && m('label', [
							'Rewatched',
							m('input', {
								type: 'checkbox',
								onchange: e => state.rewatched = e && e.target && e.target.checked,
								checked: state.rewatched
							})
						]),
						m('div.label', [
							'Rate',
							m(Rating, {
								onchange: val => state.rating = val,
								value: state.rating
							})
						]),
						m('textarea', {
							rows: 3,
							placeholder: 'Add your review...',
							oninput: e => state.content = e.target.value,
							value: state.content || ''
						}),
					],
					m('div.text-center', m('button', {
						type: 'submit',
						disabled: state.submitting
					}, state.submitting ? m('i.fas.fa-spinner.fa-spin', { 'aria-hidden': 'true' }) : 'Post')),
					m('div.text-center', m('a', {
						onclick: () => Modal(m('pre', JSON.stringify(buildEntry(), null, 4)))
					}, 'preview'))
				])
			])
	}
}

const EditorTypes = {
	Movie: {
		title: 'Movie',
		icon: '.fas.fa-film',
		type: 'watch', // `post-type`
		search: {
			options: [ 'movie' ], // At least one option required. Must match valid search `type`
			placeholder: 'title year:2023' // Optional
		},
		progress: [{ // experimental property
			key: 'finished', // want, started, finished
			label: 'Watched', // Label for dropdown
			// title: 'Watched' // Text used in summary. Defaults to label
		}]
	},
	Book: {
		title: 'Book',
		icon: '.fas.fa-book',
		type: 'read',
		search: {
			options: [ 'book' ]
		},
		progress: [
			{ key: 'want', label: 'Want to Read', title: 'Want to Read:' },
			{ key: 'started', label: 'Reading', title: 'Reading:' },
			{ key: 'finished', label: 'Read', title: 'Read:' }
		]
	},
	Listen: {
		title: 'Listen',
		icon: '.fas.fa-music',
		type: 'listen',
		search: {
			options: [ 'artist', 'album', 'track' ]
		},
		progress: [
			{ key: 'finished', label: 'Listened', title: 'Listened to' }
		]
	}
}

const MovieEditor = { view: () => m(MediaEditor, EditorTypes.Movie) }
const BookEditor = { view: () => m(MediaEditor, EditorTypes.Book) }
const ListenEditor = { view: () => m(MediaEditor, EditorTypes.Listen) }

export {
	MovieEditor,
	BookEditor,
	ListenEditor,
}
