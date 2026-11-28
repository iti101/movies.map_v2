import { useId, useState } from 'react'
import { createReview, getReviewsForMedia } from '../../API/novi.js'
import Button from '../../components/Button.jsx'
import { fieldClass } from '../../components/field-class.js'
import StarRating from '../../components/StarRating.jsx'
import StatusCopy from '../../components/StatusCopy.jsx'
import { useSession } from '../../context/session-context.js'
import { formatDate } from '../../lib/format.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useTask } from '../../hooks/useTask.js'
import { Section } from './bits.jsx'

export default function Reviews({ item }) {
  const fieldId = useId()
  const { isLoggedIn, user, token, openAuth } = useSession()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const { status: publishStatus, error: formError, setError: setFormError, run: publish } = useTask()
  const submitting = publishStatus === 'loading'
  const { status, data, setData: setReviews } = useAsync(
    (signal) => getReviewsForMedia(item.mediaType, item.id, token, { signal }),
    [item.id, item.mediaType, token],
    { keepPreviousData: true },
  )
  const reviews = data ?? []

  function handleWrite() {
    if (!isLoggedIn || user?.id == null) {
      openAuth()
      return
    }
    setOpen((current) => !current)
    setFormError('')
  }

  async function handlePublish() {
    const trimmed = text.trim()
    if (!rating && !trimmed) {
      setFormError('Add a star rating or write a short review.')
      return
    }
    if (!token || user?.id == null) {
      openAuth()
      return
    }

    const result = await publish(() =>
      createReview(
        {
          userId: user.id,
          mediaType: item.mediaType,
          mediaId: item.id,
          text: trimmed,
          rating,
        },
        token,
      ),
    )
    if (result.aborted || result.error) return
    setReviews(result.value)
    setText('')
    setRating(0)
    setOpen(false)
  }

  return (
    <Section title="Reviews">
      <div className="detail__review-compose">
        <Button variant="solid" onClick={handleWrite} aria-expanded={open}>
          Write a review
        </Button>
        {open && (
          <div className="detail__review-form">
            <StarRating value={rating} onChange={setRating} label="Your rating" />
            <label className="detail__kicker" htmlFor={fieldId}>
              Your review
            </label>
            <textarea
              id={fieldId}
              className={fieldClass('area')}
              rows={4}
              maxLength={2000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What did you think?"
            />
            <Button variant="solid" onClick={handlePublish} disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        )}
        {formError && (
          <p className="ui-status ui-status--error" role="alert">
            {formError}
          </p>
        )}
      </div>

      <StatusCopy
        status={status === 'loading' ? 'loading' : reviews.length === 0 ? 'empty' : 'success'}
        loading="Loading reviews…"
        empty="No reviews yet."
        className="detail__text"
      />
      {status !== 'loading' && reviews.length > 0 && (
        <ul className="detail__reviews">
          {reviews.map((review) => {
            const isOwn = user?.id != null && Number(review.userId) === Number(user.id)
            const author = isOwn && user.username ? user.username : 'Member'
            const when = review.createdAt ? formatDate(review.createdAt) : null
            return (
              <li key={review.id ?? `${review.userId}-${review.createdAt}`} className="detail__review">
                <div className="detail__review-meta">
                  <span className="detail__cast-name">{author}</span>
                  {when && <span className="detail__muted">{when}</span>}
                </div>
                {Number(review.rating) > 0 && (
                  <StarRating
                    value={Number(review.rating)}
                    interactive={false}
                    label={`${review.rating} out of 5 stars`}
                  />
                )}
                {review.text && <p className="detail__text">{review.text}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
