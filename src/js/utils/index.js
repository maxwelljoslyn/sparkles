const currentTime = () => Math.floor(Date.now() / 1000)

const formatDate = t => (new Date(t * 1000)).toLocaleDateString()
// const dateInRFC3339 = () => (new Date()).toISOString().split('T')[0]

const dateInRFC3339 = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// https://indieauth.spec.indieweb.org/#url-canonicalization
const canonicalURL = urlString => {
	let url
	try {
		url = new URL(urlString)
	} catch (_) {
		return null
	}
	return url && ['http:', 'https:'].includes(url.protocol) ? url.href : null
}

const ratingToStars = rating => !rating ? '' : '★'.repeat(rating) + (rating % 1 != 0 ? '½' : '')

export {
	canonicalURL,
	currentTime,
	formatDate,
	dateInRFC3339,
	ratingToStars
}
