import React, { useState, useEffect } from 'react';
import { Store, Star, X, Shirt, ArrowRight, ChevronDown, ChevronUp , ThumbsUp} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ProductCard } from './ProductCard';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Review } from '../types';
import { User } from '../types';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

interface SellerProfileModalProps { setCurrentView?: (view: "catalog" | "seller_dashboard") => void; }
export const SellerProfileModal: React.FC<SellerProfileModalProps> = ({ setCurrentView }) => {
  const { 
    selectedSellerInfo, 
    isSellerProfileOpen, 
    closeSellerProfile, 
    products, 
    setFilterState,
    setIsDetailModalOpen,
    setIsStoreProfileModalOpen
  } = useInventory();

  const [sellerData, setSellerData] = useState<Partial<User> | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState<boolean>(false);
  const { currentUser, openAuthModal } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  const [isReviewsExpanded, setIsReviewsExpanded] = useState<boolean>(true);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');

  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [isAllReviewsModalOpen, setIsAllReviewsModalOpen] = useState<boolean>(false);
  const [reviewFilterRating, setReviewFilterRating] = useState<number | 'All'>('All');
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  useBodyScrollLock(isSellerProfileOpen && !!selectedSellerInfo);


  useEffect(() => {
    if (selectedSellerInfo) {
      setIsReviewsExpanded(true);
    }
  }, [selectedSellerInfo]);

  useEffect(() => {
    if (!selectedSellerInfo?.sellerId) return;
    let isMounted = true;
    const fetchReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const revRef = collection(db, 'reviews');
        const q = query(revRef, where('sellerId', '==', selectedSellerInfo.sellerId));
        const snaps = await getDocs(q);
        if (isMounted) {
          const fetchedReviews: Review[] = [];
          snaps.forEach(doc => fetchedReviews.push(doc.data() as Review));
                    fetchedReviews.sort((a, b) => {
            const upvotesDiff = (b.upvotes || 0) - (a.upvotes || 0);
            if (upvotesDiff !== 0) return upvotesDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setReviews(fetchedReviews);
        }
      } catch(err) {
        console.warn('Error fetching reviews:', err);
      } finally {
        if(isMounted) setIsLoadingReviews(false);
      }
    };
    fetchReviews();
    return () => { isMounted = false; };
  }, [selectedSellerInfo]);

  const hasLeftReview = currentUser ? reviews.some(r => r.buyerId === currentUser.id) : false;
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) : '0.0';
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating as keyof typeof ratingCounts]++;
  });

  
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      closeSellerProfile();
      openAuthModal('login');
      return;
    }
    if (!selectedSellerInfo?.sellerId) return;
    setIsSubmittingReview(true);
    try {
      const reviewId = `${selectedSellerInfo.sellerId}_${currentUser.id}`;
      const existingReview = reviews.find(r => r.id === reviewId);
      
      const newReview: Review = {
        id: reviewId,
        sellerId: selectedSellerInfo.sellerId,
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        rating: newRating,
        comment: newComment.trim(),
        createdAt: existingReview ? existingReview.createdAt : new Date().toISOString()
      };
      
      const revRef = doc(db, 'reviews', reviewId);
      await setDoc(revRef, newReview);

      let updatedReviews;
      if (existingReview) {
        updatedReviews = reviews.map(r => r.id === reviewId ? { ...r, ...newReview } : r);
      } else {
        updatedReviews = [newReview, ...reviews];
      }
      
      updatedReviews.sort((a, b) => {
        const upvotesDiff = (b.upvotes || 0) - (a.upvotes || 0);
        if (upvotesDiff !== 0) return upvotesDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setReviews(updatedReviews);
      setIsReviewFormOpen(false);
      setNewComment('');
      setNewRating(5);

      const newTotal = updatedReviews.length;
      const newAvg = updatedReviews.reduce((acc, r) => acc + r.rating, 0) / newTotal;
      
      const userRef = doc(db, 'users', selectedSellerInfo.sellerId);
      await updateDoc(userRef, { rating: parseFloat(newAvg.toFixed(2)) });
      if (sellerData) {
        setSellerData({ ...sellerData, rating: parseFloat(newAvg.toFixed(2)) });
      }

    } catch(err) {
      console.error('Failed to submit review', err);
      alert('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReviewClick = (review: Review) => {
    setNewRating(review.rating);
    setNewComment(review.comment || '');
    setIsReviewFormOpen(true);
    setIsAllReviewsModalOpen(false);
    setIsReviewsExpanded(true);
  };


  const handleToggleUpvote = async (reviewId: string) => {
    if (!currentUser) return;
    
    try {
      const reviewIndex = reviews.findIndex(r => r.id === reviewId);
      if (reviewIndex === -1) return;
      
      const review = reviews[reviewIndex];
      const upvotedBy = review.upvotedBy || [];
      const hasUpvoted = upvotedBy.includes(currentUser.id);
      
      const newUpvotedBy = hasUpvoted
        ? upvotedBy.filter(id => id !== currentUser.id)
        : [...upvotedBy, currentUser.id];
        
      const newUpvotes = newUpvotedBy.length;
      
      const updatedReview = { ...review, upvotes: newUpvotes, upvotedBy: newUpvotedBy };
      
      // Update in Firestore
      const revRef = doc(db, 'reviews', reviewId);
      await setDoc(revRef, updatedReview);
      
      // Update local state and resort
      const newReviews = [...reviews];
      newReviews[reviewIndex] = updatedReview;
      
      newReviews.sort((a, b) => {
        const upvotesDiff = (b.upvotes || 0) - (a.upvotes || 0);
        if (upvotesDiff !== 0) return upvotesDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setReviews(newReviews);
    } catch (err) {
      console.error('Failed to toggle upvote', err);
    }
  };

  const handleDeleteReviewConfirm = async () => {
    if (!reviewToDelete) return;
    setIsSubmittingReview(true);
    try {
      await deleteDoc(doc(db, 'reviews', reviewToDelete));
      
      const updatedReviews = reviews.filter(r => r.id !== reviewToDelete);
      setReviews(updatedReviews);
      
      const newTotal = updatedReviews.length;
      const newAvg = newTotal > 0 ? (updatedReviews.reduce((acc, r) => acc + r.rating, 0) / newTotal) : 0.0;
      
      if (selectedSellerInfo?.sellerId) {
        const userRef = doc(db, 'users', selectedSellerInfo.sellerId);
        await updateDoc(userRef, { rating: parseFloat(newAvg.toFixed(2)) });
        if (sellerData) {
          setSellerData({ ...sellerData, rating: parseFloat(newAvg.toFixed(2)) });
        }
      }
      
      setIsReviewFormOpen(false);
      setNewComment('');
      setNewRating(5);

    } catch (err) {
      console.error('Failed to delete review', err);
    } finally {
      setIsSubmittingReview(false);
      setReviewToDelete(null);
    }
  };



  useEffect(() => {
    if (!selectedSellerInfo?.sellerId) return;

    if (currentUser && currentUser.id === selectedSellerInfo.sellerId) {
      setSellerData(currentUser as User);
      setIsLoadingUser(false);
      return;
    }

    let isMounted = true;
    setIsLoadingUser(true);

    const fetchSellerUser = async () => {
      try {
        const userRef = doc(db, 'users', selectedSellerInfo.sellerId);
        const snap = await getDoc(userRef);
        if (snap.exists() && isMounted) {
          setSellerData(snap.data() as User);
        } else if (isMounted) {
          setSellerData(null);
        }
      } catch (err) {
        console.warn('Error fetching seller profile from Firestore:', err);
      } finally {
        if (isMounted) setIsLoadingUser(false);
      }
    };

    fetchSellerUser();

    return () => {
      isMounted = false;
    };
  }, [selectedSellerInfo, currentUser]);

  if (!isSellerProfileOpen || !selectedSellerInfo) return null;

  const boutiqueName = sellerData?.boutiqueName || selectedSellerInfo.sellerBoutique;
  const curatorName = sellerData?.name || selectedSellerInfo.sellerName || 'Curator';
  const avatarUrl = sellerData?.avatar || selectedSellerInfo.sellerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';
  const bio = sellerData?.boutiqueBio !== undefined ? sellerData.boutiqueBio : selectedSellerInfo.sellerBio;

  // Garments listed by this seller
  const sellerGarments = products.filter(p => 
    (p.sellerId && p.sellerId === selectedSellerInfo.sellerId) ||
    (p.sellerBoutique && p.sellerBoutique.toLowerCase() === boutiqueName.toLowerCase())
  );

  const totalStoreViews = sellerGarments.reduce((acc, item) => acc + (item.viewsCount || 0), 0);

  const handleFilterCatalog = () => {
    setFilterState({
      searchQuery: boutiqueName,
      categories: [],
      clothingType: 'All',
      sizes: [],
      color: 'All',
      conditions: [],
      eras: [],
      minPrice: 0,
      maxPrice: Infinity,
      inStockOnly: false,
      sortBy: 'latest'
    });
    closeSellerProfile();
    setIsDetailModalOpen(false);
    if (setCurrentView) setCurrentView('catalog');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  return (
    <div 
      id="seller-profile-modal-overlay"
      className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSellerProfile();
      }}
    >
      <div 
        id="seller-profile-modal-container"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="bg-stone-900 text-stone-100 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="font-sans text-xs font-bold tracking-wider uppercase text-amber-200">
              Seller Profile
            </span>
          </div>
          <button
            type="button"
            id="close-seller-profile-modal-btn"
            onClick={closeSellerProfile}
            className="text-stone-400 hover:text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          
          {/* Seller Header Banner Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
              <img
                src={avatarUrl}
                alt={boutiqueName}
                style={{ objectPosition: sellerData?.avatarPosition || '50% 50%' }}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover border-2 border-amber-800 shadow-md shrink-0 bg-stone-200"
              />
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-sans text-xl sm:text-2xl font-bold text-stone-950 truncate">
                    {boutiqueName}
                  </h2>
                </div>
                
                <p className="text-xs text-stone-600 font-medium">
                  Curated by <span className="font-semibold text-stone-900">{curatorName}</span>
                </p>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-stone-500 pt-1">
                  <button type="button" onClick={() => setIsReviewsExpanded(!isReviewsExpanded)} className="flex items-center gap-1 text-amber-800 hover:text-amber-900 font-bold transition-colors">
                    <Star className={`w-3.5 h-3.5 ${totalReviews > 0 ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                    <span>{averageRating} {totalReviews > 0 ? `(${totalReviews})` : '(No reviews)'}</span>
                    {isReviewsExpanded ? <ChevronUp className="w-3 h-3 text-stone-400 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-stone-400 ml-0.5" />}
                  </button>
                  <span className="text-stone-300">•</span>
                  <span>{sellerGarments.length} Active Listings</span>
                  <span className="text-stone-300">•</span>
                  <span>{totalStoreViews.toLocaleString()} Total Views</span>
                </div>
              </div>
            </div>

          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              type="button"
              id="filter-store-catalog-btn"
              onClick={handleFilterCatalog}
              className="w-full px-4 py-2.5 sm:py-2 bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 text-stone-900 hover:text-amber-950 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-between gap-2 cursor-pointer"
            >
              <span>Explore Store in Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-800" />
            </button>
            {currentUser?.id === selectedSellerInfo.sellerId && (
              <button
                type="button"
                onClick={() => {
                  setIsStoreProfileModalOpen(true);
                }}
                className="w-full px-4 py-2.5 sm:py-2 bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 text-stone-900 hover:text-amber-950 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <span>Store & Account Settings</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-800" />
              </button>
            )}
          </div>
          </div>

          
          {/* Reviews Collapsible Section */}
          {isReviewsExpanded && (
            <div className="border border-stone-200 rounded-2xl p-5 shadow-2xs bg-stone-50 animate-in slide-in-from-top-2 duration-200">
              <h3 className="text-xs font-bold text-stone-900 uppercase font-sans tracking-wider mb-4">Reviews & Ratings</h3>
              
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <div className="flex flex-col items-center justify-center shrink-0">
                  <span className="text-4xl font-black text-stone-900 font-sans">{averageRating}</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= parseFloat(averageRating as string) ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />

                    ))}
                  </div>
                  {reviews.length > 3 && (
                    <button
                      onClick={() => setIsAllReviewsModalOpen(true)}
                      className="w-full mt-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      View all {reviews.length} reviews
                    </button>
                  )}

                  <span className="text-xs font-medium text-stone-500 mt-1">{totalReviews} Review{totalReviews !== 1 && 's'}</span>
                </div>
                
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingCounts[star as keyof typeof ratingCounts] || 0;
                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs font-medium text-stone-600">
                        <span className="w-2">{star}</span>
                        <Star className="w-3 h-3 text-stone-400" />
                        <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(!currentUser || currentUser.id !== selectedSellerInfo.sellerId) && (
                (!hasLeftReview || isReviewFormOpen) && (
                  <div className="mb-6 pt-4 border-t border-stone-200">
                    {!isReviewFormOpen && !hasLeftReview ? (
                      <button 
                        onClick={() => setIsReviewFormOpen(true)}
                        className="w-full py-2 bg-stone-900 text-amber-50 rounded-lg text-xs font-bold shadow-sm hover:bg-stone-800 transition-colors"
                      >
                        Write a Review
                      </button>
                    ) : isReviewFormOpen ? (
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">Rating</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Star className={`w-6 h-6 ${star <= newRating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">Review (Optional)</label>
                          <textarea
                            value={newComment}
                            onChange={(e) => {
                              setNewComment(e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onBlur={(e) => {
                              e.target.style.height = 'auto';
                            }}
                            className="w-full text-sm p-3 rounded-xl border border-stone-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none resize-none overflow-y-auto max-h-[300px]"
                            rows={3}
                            placeholder="What was your experience with this curator?"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsReviewFormOpen(false)}
                            className="px-4 py-2 rounded-lg text-xs font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                            disabled={isSubmittingReview}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-stone-900 text-amber-50 rounded-lg text-xs font-bold shadow-sm hover:bg-stone-800 transition-colors"
                            disabled={isSubmittingReview}
                          >
                            {isSubmittingReview ? 'Submitting...' : (hasLeftReview ? 'Update Review' : 'Submit Review')}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                )
              )}

              <div className="space-y-4">
                {isLoadingReviews ? (
                  <p className="text-xs text-stone-500 italic">Loading reviews...</p>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4 divide-y divide-stone-100 max-h-60 overflow-y-auto pr-2">
                    {reviews.slice(0, 3).map(review => (
                      <div key={review.id} className="pt-4 first:pt-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-stone-900">{review.buyerName}</span>
                          <div className="flex items-center gap-3">
                            {currentUser?.id === review.buyerId && (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEditReviewClick(review)} className="text-[10px] text-stone-500 hover:text-amber-700 font-bold transition-colors">Edit</button>
                                <button onClick={() => setReviewToDelete(review.id)} className="text-[10px] text-stone-500 hover:text-red-600 font-bold transition-colors">Delete</button>
                              </div>
                            )}
                            <span className="text-[10px] font-medium text-stone-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-xs text-stone-600 font-sans leading-relaxed mb-2">
                            {review.comment}
                          </p>
                        )}
                        <div className="flex items-center mt-1">
                          <button 
                            onClick={() => handleToggleUpvote(review.id)}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border transition-colors ${
                              review.upvotedBy?.includes(currentUser?.id || '')
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <ThumbsUp className={`w-3 h-3 ${review.upvotedBy?.includes(currentUser?.id || '') ? 'fill-amber-800' : ''}`} />
                            {review.upvotes || 0}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic">No reviews yet for this curator.</p>
                )}
              </div>
            </div>
          )}

          {/* Boutique Bio & Curation Notes */}
          <div className="border border-stone-200 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-stone-900 uppercase font-sans tracking-wider mb-3">
              Boutique Biography
            </h3>
            <div className="pt-2 border-t border-stone-100">
              {isLoadingUser ? (
                <p className="text-xs text-stone-400 italic">Loading curator details...</p>
              ) : bio && bio.trim().length > 0 ? (
                <div>
                  <p className="text-sm text-stone-800 italic leading-relaxed font-sans line-clamp-3">
                    "{bio.trim()}"
                  </p>
                  <button 
                    onClick={() => setIsBioModalOpen(true)}
                    className="mt-2 ml-auto text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1"
                  >
                    Read more <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">
                  This boutique curator has not added custom bio notes yet.
                </p>
              )}
            </div>
          </div>

          {/* Listed Items Grid */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h3 className="font-sans text-lg font-bold text-stone-950 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-amber-800" />
                <span>Items from {boutiqueName}</span>
              </h3>
              <span className="text-xs font-sans font-medium text-stone-500">
                {sellerGarments.length} item{sellerGarments.length === 1 ? '' : 's'} available
              </span>
            </div>

            {sellerGarments.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-stone-500 space-y-2">
                <p className="text-sm font-semibold text-stone-700">No active garments currently listed</p>
                <p className="text-xs">Check back soon for upcoming thrift drops from this boutique!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                {sellerGarments.map(item => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

            {/* Bio Modal */}
      {isBioModalOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBioModalOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-stone-900 text-stone-100 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-bold uppercase tracking-wider font-sans flex items-center gap-2">
                Boutique Biography
              </h2>
              <button 
                onClick={() => setIsBioModalOpen(false)} 
                className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              <p className="text-sm text-stone-800 italic leading-relaxed font-sans whitespace-pre-wrap">
                "{bio?.trim()}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Reviews Modal */}
      {isAllReviewsModalOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAllReviewsModalOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-stone-900 text-stone-100 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-bold uppercase tracking-wider font-sans flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                All Reviews
              </h2>
              <button 
                onClick={() => setIsAllReviewsModalOpen(false)} 
                className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 sm:p-4 border-b border-stone-100 flex gap-2 overflow-x-auto shrink-0">
              {['All', 5, 4, 3, 2, 1].map(rating => (
                <button
                  key={rating}
                  onClick={() => setReviewFilterRating(rating as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                    reviewFilterRating === rating
                      ? 'bg-stone-900 text-amber-50 border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {rating === 'All' ? 'All Reviews' : `${rating} Stars`}
                </button>
              ))}
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 divide-y divide-stone-100">
              {reviews
                .filter(r => reviewFilterRating === 'All' || r.rating === reviewFilterRating)
                .map(review => (
                  <div key={review.id} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">{review.buyerName}</span>
                      <div className="flex items-center gap-3">
                        {currentUser?.id === review.buyerId && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditReviewClick(review)} className="text-[10px] text-stone-500 hover:text-amber-700 font-bold transition-colors">Edit</button>
                            <button onClick={() => setReviewToDelete(review.id)} className="text-[10px] text-stone-500 hover:text-red-600 font-bold transition-colors">Delete</button>
                          </div>
                        )}
                        <span className="text-[10px] font-medium text-stone-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-xs text-stone-600 font-sans leading-relaxed mb-2">
                        {review.comment}
                      </p>
                    )}
                    <div className="flex items-center mt-1">
                      <button 
                        onClick={() => handleToggleUpvote(review.id)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border transition-colors ${
                          review.upvotedBy?.includes(currentUser?.id || '')
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <ThumbsUp className={`w-3 h-3 ${review.upvotedBy?.includes(currentUser?.id || '') ? 'fill-amber-800' : ''}`} />
                        {review.upvotes || 0}
                      </button>
                    </div>
                  </div>
                ))}
              {reviews.filter(r => reviewFilterRating === 'All' || r.rating === reviewFilterRating).length === 0 && (
                <div className="py-8 text-center text-stone-500">
                  <p className="text-sm font-semibold">No reviews found</p>
                  <p className="text-xs mt-1">There are no reviews matching this rating.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {reviewToDelete && (
        <div 
          className="fixed inset-0 z-[70] bg-stone-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReviewToDelete(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-stone-900 mb-2">Delete Review?</h3>
            <p className="text-sm text-stone-600 mb-6">Are you sure you want to delete this review? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setReviewToDelete(null)} 
                disabled={isSubmittingReview} 
                className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteReviewConfirm} 
                disabled={isSubmittingReview} 
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {isSubmittingReview ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

