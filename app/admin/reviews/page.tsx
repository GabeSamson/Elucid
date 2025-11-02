'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  title: string | null;
  content: string;
  isPinned: boolean;
  isApproved: boolean;
  isAnonymous: boolean;
  hideAuthor: boolean;
  productId: string | null;
  createdAt: string;
  pinLocation: 'AUTO' | 'HOME' | 'PRODUCT';
  product?: {
    id: string;
    name: string;
  } | null;
}

type PinLocation = 'AUTO' | 'HOME' | 'PRODUCT';

const derivePinLocation = (review: Review): PinLocation => {
  if (review.pinLocation && review.pinLocation !== 'AUTO') {
    return review.pinLocation;
  }
  return review.productId ? 'PRODUCT' : 'HOME';
};

const getDisplayName = (review: Review): string | null => {
  if (review.hideAuthor) return null;
  if (review.isAnonymous) return 'Anonymous';
  return review.name;
};

export const dynamic = 'force-dynamic';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; rating: number; title: string; content: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pinSelections, setPinSelections] = useState<Record<string, PinLocation>>({});
  const [anonymizeSelections, setAnonymizeSelections] = useState<Record<string, boolean>>({});
  const [hideAuthorSelections, setHideAuthorSelections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      const data = await res.json();

      if (res.ok) {
        const fetchedReviews: Review[] = data.reviews || [];
        setReviews(fetchedReviews);
        const selections: Record<string, PinLocation> = {};
        const anonymize: Record<string, boolean> = {};
        const hideAuthor: Record<string, boolean> = {};
        fetchedReviews.forEach((review) => {
          selections[review.id] = derivePinLocation(review);
          anonymize[review.id] = review.isAnonymous ?? false;
          hideAuthor[review.id] = review.hideAuthor ?? false;
        });
        setPinSelections(selections);
        setAnonymizeSelections(anonymize);
        setHideAuthorSelections(hideAuthor);
      } else {
        throw new Error(data.error || 'Failed to load reviews');
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to load reviews' });
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (
    id: string,
    updates: { isApproved?: boolean; isPinned?: boolean; pinLocation?: PinLocation; isAnonymous?: boolean; hideAuthor?: boolean }
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      setFeedback({ type: 'success', message: 'Review updated successfully' });
      await fetchReviews();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to update review' });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteReview = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this review?');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete review');
      }

      setFeedback({ type: 'success', message: 'Review deleted successfully' });
      await fetchReviews();
      setSelectedReview(null);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to delete review' });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePinSelectionChange = (id: string, value: PinLocation) => {
    setPinSelections((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setEditForm({
      name: review.name,
      rating: review.rating,
      title: review.title || '',
      content: review.content,
    });
  };

  const closeEditModal = () => {
    setEditingReview(null);
    setEditForm(null);
  };

  const saveEditedReview = async () => {
    if (!editingReview || !editForm) return;

    setUpdatingId(editingReview.id);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReview.id,
          name: editForm.name,
          rating: editForm.rating,
          title: editForm.title,
          content: editForm.content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      setFeedback({ type: 'success', message: 'Review updated successfully' });
      await fetchReviews();
      closeEditModal();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to update review' });
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingReviews = reviews.filter(r => !r.isApproved);
  const approvedReviews = reviews.filter(r => r.isApproved && !r.isPinned);
  const pinnedReviews = reviews.filter(r => r.isPinned);
  const pinnedHomepageReviews = pinnedReviews.filter((review) => derivePinLocation(review) === 'HOME');
  const pinnedProductReviews = pinnedReviews.filter((review) => derivePinLocation(review) === 'PRODUCT');
  const productReviews = reviews.filter(r => r.productId);
  const generalFeedback = reviews.filter(r => !r.productId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-charcoal-dark mb-2">Reviews & Feedback</h1>
          <p className="text-charcoal/60">
            {reviews.length} total • {productReviews.length} product reviews • {generalFeedback.length} general feedback • {pendingReviews.length} pending
          </p>
        </div>
        <button
          onClick={fetchReviews}
          className="inline-flex items-center justify-center px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal uppercase tracking-wider text-sm"
        >
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-beige/20 border-beige text-charcoal'
              : 'bg-cream-dark border-charcoal text-charcoal-dark'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="text-charcoal/60 text-sm">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-cream p-6 border border-charcoal/10">
          <p className="text-charcoal/60 text-sm">No reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Reviews */}
          {pendingReviews.length > 0 && (
            <div className="bg-amber-50 p-6 border border-amber-200">
              <h2 className="font-serif text-2xl text-charcoal-dark mb-4">
                Pending Approval ({pendingReviews.length})
              </h2>
              <div className="space-y-4">
                {pendingReviews.map((review) => (
                  <div key={review.id} className="bg-white p-4 border border-charcoal/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          {getDisplayName(review) && (
                            <span className="font-medium text-charcoal-dark">
                              {getDisplayName(review)}
                            </span>
                          )}
                          <div className="text-charcoal-dark">
                            {'★'.repeat(review.rating)}
                            <span className="text-charcoal/30">{'★'.repeat(5 - review.rating)}</span>
                          </div>
                          {review.product ? (
                            <span className="px-2 py-1 bg-beige text-charcoal text-xs uppercase tracking-wider">
                              Product: {review.product.name}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-cream-dark text-charcoal text-xs uppercase tracking-wider">
                              General Feedback
                            </span>
                          )}
                        </div>
                        {review.title && (
                          <h3 className="font-medium text-charcoal mb-2">{review.title}</h3>
                        )}
                        <p className="text-sm text-charcoal-light mb-2">{review.content}</p>
                        <p className="text-xs text-charcoal/60">
                          {new Date(review.createdAt).toLocaleString()}
                          {review.email && ` • ${review.email}`}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditModal(review)}
                          className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => updateReview(review.id, { isApproved: true })}
                          disabled={updatingId === review.id}
                          className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          {updatingId === review.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => deleteReview(review.id)}
                          disabled={deletingId === review.id}
                          className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          {deletingId === review.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pinned Reviews */}
          {pinnedReviews.length > 0 && (
            <div className="bg-beige/20 p-6 border border-beige space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-charcoal-dark mb-2">
                  Pinned Highlights
                </h2>
                <p className="text-xs text-charcoal/60">
                  Choose whether a testimonial appears on the homepage or its product page. Homepage pins showcase social proof across the site.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-wider text-charcoal/70">
                  Homepage ({pinnedHomepageReviews.length})
                </h3>
                {pinnedHomepageReviews.length === 0 ? (
                  <div className="rounded-lg border border-charcoal/10 bg-cream p-4 text-sm text-charcoal/60">
                    No reviews are pinned to the homepage yet.
                  </div>
                ) : (
                  pinnedHomepageReviews.map((review) => {
                    const selection = pinSelections[review.id] ?? derivePinLocation(review);
                    const availableLocations: PinLocation[] = review.productId ? ['PRODUCT', 'HOME'] : ['HOME'];
                    return (
                      <div key={review.id} className="bg-cream p-4 border border-charcoal/10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="font-medium text-charcoal-dark">
                                {review.isAnonymous ? 'Anonymous' : review.name}
                              </span>
                              <div className="text-charcoal-dark">
                                {'★'.repeat(review.rating)}
                                <span className="text-charcoal/30">{'★'.repeat(5 - review.rating)}</span>
                              </div>
                              <span className="px-2 py-1 bg-charcoal-dark text-cream text-xs uppercase tracking-wider">
                                Homepage
                              </span>
                            </div>
                            {review.title && (
                              <h3 className="font-medium text-charcoal mb-2">{review.title}</h3>
                            )}
                            <p className="text-sm text-charcoal-light mb-2">{review.content}</p>
                            <p className="text-xs text-charcoal/60">
                              {new Date(review.createdAt).toLocaleString()}
                            </p>
                            {availableLocations.length > 1 && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/70">
                                <span>Pin to</span>
                                <select
                                  value={selection}
                                  onChange={(event) =>
                                    handlePinSelectionChange(review.id, event.target.value as PinLocation)
                                  }
                                  className="select-modern-sm"
                                >
                                  {availableLocations.map((location) => (
                                    <option key={location} value={location}>
                                      {location === 'HOME' ? 'Homepage' : 'Product page'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-charcoal/70">
                              <span className="block mb-1">Display name as:</span>
                              <div className="flex gap-3">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`name-display-${review.id}`}
                                    checked={!(hideAuthorSelections[review.id] ?? review.hideAuthor) && !(anonymizeSelections[review.id] ?? review.isAnonymous)}
                                    onChange={() => {
                                      setHideAuthorSelections({...hideAuthorSelections, [review.id]: false});
                                      setAnonymizeSelections({...anonymizeSelections, [review.id]: false});
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>Name</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`name-display-${review.id}`}
                                    checked={!(hideAuthorSelections[review.id] ?? review.hideAuthor) && (anonymizeSelections[review.id] ?? review.isAnonymous)}
                                    onChange={() => {
                                      setHideAuthorSelections({...hideAuthorSelections, [review.id]: false});
                                      setAnonymizeSelections({...anonymizeSelections, [review.id]: true});
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>Anonymous</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`name-display-${review.id}`}
                                    checked={hideAuthorSelections[review.id] ?? review.hideAuthor}
                                    onChange={() => {
                                      setHideAuthorSelections({...hideAuthorSelections, [review.id]: true});
                                      setAnonymizeSelections({...anonymizeSelections, [review.id]: false});
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>No name</span>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            <button
                              onClick={() => openEditModal(review)}
                              className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider"
                            >
                              Edit
                            </button>
                            {availableLocations.length > 1 && (
                              <button
                                onClick={() =>
                                  updateReview(review.id, {
                                    isPinned: true,
                                    pinLocation: pinSelections[review.id] ?? derivePinLocation(review),
                                    isAnonymous: anonymizeSelections[review.id] ?? review.isAnonymous,
                                    hideAuthor: hideAuthorSelections[review.id] ?? review.hideAuthor,
                                  })
                                }
                                disabled={updatingId === review.id}
                                className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                              >
                                {updatingId === review.id ? 'Saving...' : 'Save Changes'}
                              </button>
                            )}
                            {availableLocations.length === 1 && (
                              <button
                                onClick={() =>
                                  updateReview(review.id, {
                                    isAnonymous: anonymizeSelections[review.id] ?? review.isAnonymous,
                                    hideAuthor: hideAuthorSelections[review.id] ?? review.hideAuthor,
                                  })
                                }
                                disabled={updatingId === review.id}
                                className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                              >
                                {updatingId === review.id ? 'Saving...' : 'Save Changes'}
                              </button>
                            )}
                            <button
                              onClick={() => updateReview(review.id, { isPinned: false })}
                              disabled={updatingId === review.id}
                              className="px-4 py-2 bg-charcoal text-cream hover:bg-charcoal-dark text-xs uppercase tracking-wider disabled:opacity-50"
                            >
                              {updatingId === review.id ? 'Unpinning...' : 'Unpin'}
                            </button>
                            <button
                              onClick={() => setSelectedReview(review)}
                              className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-wider text-charcoal/70">
                  Product Pages ({pinnedProductReviews.length})
                </h3>
                {pinnedProductReviews.length === 0 ? (
                  <div className="rounded-lg border border-charcoal/10 bg-cream p-4 text-sm text-charcoal/60">
                    No product reviews are pinned yet.
                  </div>
                ) : (
                  pinnedProductReviews.map((review) => {
                    const selection = pinSelections[review.id] ?? derivePinLocation(review);
                    const availableLocations: PinLocation[] = ['PRODUCT', 'HOME'];
                    return (
                      <div key={review.id} className="bg-cream p-4 border border-charcoal/10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="font-medium text-charcoal-dark">
                                {review.isAnonymous ? 'Anonymous' : review.name}
                              </span>
                              <div className="text-charcoal-dark">
                                {'★'.repeat(review.rating)}
                                <span className="text-charcoal/30">{'★'.repeat(5 - review.rating)}</span>
                              </div>
                              {review.product && (
                                <span className="px-2 py-1 bg-beige text-charcoal text-xs uppercase tracking-wider">
                                  {review.product.name}
                                </span>
                              )}
                            </div>
                            {review.title && (
                              <h3 className="font-medium text-charcoal mb-2">{review.title}</h3>
                            )}
                            <p className="text-sm text-charcoal-light mb-2">{review.content}</p>
                            <p className="text-xs text-charcoal/60">
                              {new Date(review.createdAt).toLocaleString()}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/70">
                              <span>Pin to</span>
                              <select
                                value={selection}
                                onChange={(event) =>
                                  handlePinSelectionChange(review.id, event.target.value as PinLocation)
                                }
                                className="select-modern-sm"
                              >
                                {availableLocations.map((location) => (
                                  <option key={location} value={location}>
                                    {location === 'HOME' ? 'Homepage' : 'Product page'}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="mt-2 text-xs text-charcoal/70">
                              <span className="block mb-1">Display name as:</span>
                              <div className="flex gap-3">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`name-display-${review.id}`}
                                    checked={!(hideAuthorSelections[review.id] ?? review.hideAuthor) && !(anonymizeSelections[review.id] ?? review.isAnonymous)}
                                    onChange={() => {
                                      setHideAuthorSelections({...hideAuthorSelections, [review.id]: false});
                                      setAnonymizeSelections({...anonymizeSelections, [review.id]: false});
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>Name</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`name-display-${review.id}`}
                                    checked={!(hideAuthorSelections[review.id] ?? review.hideAuthor) && (anonymizeSelections[review.id] ?? review.isAnonymous)}
                                    onChange={() => {
                                      setHideAuthorSelections({...hideAuthorSelections, [review.id]: false});
                                      setAnonymizeSelections({...anonymizeSelections, [review.id]: true});
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>Anonymous</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`name-display-${review.id}`}
                                    checked={hideAuthorSelections[review.id] ?? review.hideAuthor}
                                    onChange={() => {
                                      setHideAuthorSelections({...hideAuthorSelections, [review.id]: true});
                                      setAnonymizeSelections({...anonymizeSelections, [review.id]: false});
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>No name</span>
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            <button
                              onClick={() => openEditModal(review)}
                              className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                updateReview(review.id, {
                                  isPinned: true,
                                  pinLocation: pinSelections[review.id] ?? derivePinLocation(review),
                                  isAnonymous: anonymizeSelections[review.id] ?? review.isAnonymous,
                                })
                              }
                              disabled={updatingId === review.id}
                              className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                            >
                              {updatingId === review.id ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={() => updateReview(review.id, { isPinned: false })}
                              disabled={updatingId === review.id}
                              className="px-4 py-2 bg-charcoal text-cream hover:bg-charcoal-dark text-xs uppercase tracking-wider disabled:opacity-50"
                            >
                              {updatingId === review.id ? 'Unpinning...' : 'Unpin'}
                            </button>
                            <button
                              onClick={() => setSelectedReview(review)}
                              className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Approved Reviews */}
          {approvedReviews.length > 0 && (
            <div className="bg-cream p-6 border border-charcoal/10">
              <h2 className="font-serif text-2xl text-charcoal-dark mb-4">
                Approved Reviews ({approvedReviews.length})
              </h2>
              <div className="space-y-4">
                {approvedReviews.map((review) => (
                  <div key={review.id} className="bg-cream-light p-4 border border-charcoal/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          {getDisplayName(review) && (
                            <span className="font-medium text-charcoal-dark">
                              {getDisplayName(review)}
                            </span>
                          )}
                          <div className="text-charcoal-dark">
                            {'★'.repeat(review.rating)}
                            <span className="text-charcoal/30">{'★'.repeat(5 - review.rating)}</span>
                          </div>
                          {review.product ? (
                            <span className="px-2 py-1 bg-beige text-charcoal text-xs uppercase tracking-wider">
                              Product: {review.product.name}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-cream-dark text-charcoal text-xs uppercase tracking-wider">
                              General Feedback
                            </span>
                          )}
                        </div>
                        {review.title && (
                          <h3 className="font-medium text-charcoal mb-2">{review.title}</h3>
                        )}
                        <p className="text-sm text-charcoal-light mb-2">{review.content}</p>
                        <p className="text-xs text-charcoal/60">
                          {new Date(review.createdAt).toLocaleString()}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/70">
                          <span>Pin to</span>
                          <select
                            value={pinSelections[review.id] ?? derivePinLocation(review)}
                            onChange={(event) =>
                              handlePinSelectionChange(review.id, event.target.value as PinLocation)
                            }
                            className="select-modern-sm"
                          >
                            <option value="HOME">Homepage</option>
                            {review.productId && <option value="PRODUCT">Product page</option>}
                          </select>
                        </div>
                        <div className="mt-2 text-xs text-charcoal/70">
                          <span className="block mb-1">Display name as:</span>
                          <div className="flex gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`name-display-${review.id}`}
                                checked={!(hideAuthorSelections[review.id] ?? review.hideAuthor) && !(anonymizeSelections[review.id] ?? review.isAnonymous)}
                                onChange={() => {
                                  setHideAuthorSelections({...hideAuthorSelections, [review.id]: false});
                                  setAnonymizeSelections({...anonymizeSelections, [review.id]: false});
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span>Name</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`name-display-${review.id}`}
                                checked={!(hideAuthorSelections[review.id] ?? review.hideAuthor) && (anonymizeSelections[review.id] ?? review.isAnonymous)}
                                onChange={() => {
                                  setHideAuthorSelections({...hideAuthorSelections, [review.id]: false});
                                  setAnonymizeSelections({...anonymizeSelections, [review.id]: true});
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span>Anonymous</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`name-display-${review.id}`}
                                checked={hideAuthorSelections[review.id] ?? review.hideAuthor}
                                onChange={() => {
                                  setHideAuthorSelections({...hideAuthorSelections, [review.id]: true});
                                  setAnonymizeSelections({...anonymizeSelections, [review.id]: false});
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span>No name</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditModal(review)}
                          className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            updateReview(review.id, {
                              isAnonymous: anonymizeSelections[review.id] ?? review.isAnonymous,
                              hideAuthor: hideAuthorSelections[review.id] ?? review.hideAuthor,
                            })
                          }
                          disabled={updatingId === review.id}
                          className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          {updatingId === review.id ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() =>
                            updateReview(review.id, {
                              isPinned: true,
                              pinLocation: pinSelections[review.id] ?? derivePinLocation(review),
                              isAnonymous: anonymizeSelections[review.id] ?? review.isAnonymous,
                              hideAuthor: hideAuthorSelections[review.id] ?? review.hideAuthor,
                            })
                          }
                          disabled={updatingId === review.id}
                          className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          {updatingId === review.id
                            ? 'Pinning...'
                            : (pinSelections[review.id] ?? derivePinLocation(review)) === 'HOME'
                              ? 'Pin to Homepage'
                              : 'Pin to Product Page'}
                        </button>
                        <button
                          onClick={() => updateReview(review.id, { isApproved: false })}
                          disabled={updatingId === review.id}
                          className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          Unapprove
                        </button>
                        <button
                          onClick={() => deleteReview(review.id)}
                          disabled={deletingId === review.id}
                          className="px-4 py-2 border border-charcoal/20 text-charcoal hover:border-charcoal text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-charcoal-dark/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cream max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-serif text-2xl text-charcoal-dark">Review Details</h2>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-charcoal hover:text-charcoal-dark"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <strong>Name:</strong> {selectedReview.name}
              </div>
              {selectedReview.email && (
                <div>
                  <strong>Email:</strong> {selectedReview.email}
                </div>
              )}
              <div>
                <strong>Rating:</strong>{' '}
                <span className="text-charcoal-dark">
                  {'★'.repeat(selectedReview.rating)}
                  <span className="text-charcoal/30">{'★'.repeat(5 - selectedReview.rating)}</span>
                </span>
              </div>
              {selectedReview.title && (
                <div>
                  <strong>Title:</strong> {selectedReview.title}
                </div>
              )}
              <div>
                <strong>Review:</strong>
                <p className="mt-2 text-charcoal-light">{selectedReview.content}</p>
              </div>
              <div>
                <strong>Status:</strong>{' '}
                {selectedReview.isPinned ? (
                  <span className="px-2 py-1 bg-charcoal-dark text-cream text-xs uppercase">Pinned</span>
                ) : selectedReview.isApproved ? (
                  <span className="px-2 py-1 bg-beige text-charcoal text-xs uppercase">Approved</span>
                ) : (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs uppercase">Pending</span>
                )}
              </div>
              <div>
                <strong>Pin target:</strong>{' '}
                {derivePinLocation(selectedReview) === 'HOME'
                  ? 'Homepage'
                  : selectedReview.product?.name
                    ? `${selectedReview.product.name}`
                    : 'Product page'}
              </div>
              <div>
                <strong>Submitted:</strong> {new Date(selectedReview.createdAt).toLocaleString()}
              </div>

              <div className="flex gap-3 pt-4 border-t border-charcoal/10">
                <button
                  onClick={() => deleteReview(selectedReview.id)}
                  disabled={deletingId === selectedReview.id}
                  className="px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal uppercase tracking-wider text-sm disabled:opacity-50"
                >
                  {deletingId === selectedReview.id ? 'Deleting...' : 'Delete Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && editForm && (
        <div className="fixed inset-0 bg-charcoal-dark/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cream max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-serif text-2xl text-charcoal-dark">Edit Review</h2>
              <button
                onClick={closeEditModal}
                className="text-charcoal hover:text-charcoal-dark"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-charcoal/20 bg-white text-charcoal focus:outline-none focus:border-charcoal"
                  placeholder="Reviewer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, rating: star })}
                      className={`text-3xl ${
                        star <= editForm.rating ? 'text-charcoal-dark' : 'text-charcoal/30'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-charcoal/70 self-center">
                    {editForm.rating} star{editForm.rating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-charcoal/20 bg-white text-charcoal focus:outline-none focus:border-charcoal"
                  placeholder="Review title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Review Content
                </label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-charcoal/20 bg-white text-charcoal focus:outline-none focus:border-charcoal resize-y"
                  placeholder="Review content"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-charcoal/10">
                <button
                  onClick={saveEditedReview}
                  disabled={updatingId === editingReview.id || !editForm.name.trim() || !editForm.content.trim()}
                  className="px-6 py-3 bg-charcoal-dark text-cream hover:bg-charcoal uppercase tracking-wider text-sm disabled:opacity-50"
                >
                  {updatingId === editingReview.id ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={closeEditModal}
                  className="px-6 py-3 border border-charcoal/20 text-charcoal hover:border-charcoal uppercase tracking-wider text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
