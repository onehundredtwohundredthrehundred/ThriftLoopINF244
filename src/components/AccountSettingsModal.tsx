import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Store, User as UserIcon, RefreshCw, X, Trash2, Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';


const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { width: number; height: number; x: number; y: number }
): Promise<string | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  canvas.width = image.width
  canvas.height = image.height

  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return null

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return croppedCanvas.toDataURL('image/jpeg', 0.9)
}

export const AccountSettingsModal: React.FC = () => {
  const { currentUser, updateUserProfile, deleteAccount } = useAuth();
  const { 
    isStoreProfileModalOpen, 
    setIsStoreProfileModalOpen, 
    updateSellerProductsInfo 
  } = useInventory();

  // Profile Form State
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
    // Cropper State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [storeBoutiqueName, setStoreBoutiqueName] = useState('');
  const [storeBio, setStoreBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Deletion Confirmation State
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isSeller = currentUser?.role === 'seller';

  useBodyScrollLock(isStoreProfileModalOpen);

  useEffect(() => {
    if (isStoreProfileModalOpen && currentUser) {
      setUserName(currentUser.name || '');
      setUserAvatar(currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80');
      setStoreBoutiqueName(currentUser.boutiqueName || 'Curated Boutique');
      setStoreBio(currentUser.boutiqueBio || '');
      setIsConfirmingDelete(false);
      setErrorMessage('');
    }
  }, [isStoreProfileModalOpen, currentUser]);

  const showCroppedImage = useCallback(async () => {
    try {
      if (!imageToCrop || !completedCrop || !imgRef.current) return;
      setIsUploadingImage(true);
      
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      const croppedImage = canvas.toDataURL('image/jpeg', 0.9);

      if (croppedImage) {
        setUserAvatar(croppedImage);
      }
      setIsCropModalOpen(false);
      setIsUploadingImage(false);
      setImageToCrop(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (e) {
      console.error(e);
      setIsUploadingImage(false);
    }
  }, [imageToCrop, completedCrop]);

  if (!isStoreProfileModalOpen || !currentUser) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageToCrop(event.target?.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset so the same file can be selected again
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSaving(true);

    const oldBoutiqueName = currentUser.boutiqueName;

    const updates: any = {
      name: userName.trim(),
      avatar: userAvatar.trim(),
    };

    if (isSeller) {
      updates.boutiqueName = storeBoutiqueName.trim();
      updates.boutiqueBio = storeBio.trim();
    }

    const res = await updateUserProfile(updates);
    setIsSaving(false);

    if (res.success) {
      if (isSeller) {
        await updateSellerProductsInfo(currentUser.id, {
          sellerBoutique: updates.boutiqueName,
          sellerName: updates.name,
          sellerAvatar: updates.avatar,
        }, oldBoutiqueName);
      }
      setIsStoreProfileModalOpen(false);
    } else {
      setErrorMessage(res.error || 'Failed to update profile.');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setErrorMessage('');
    const res = await deleteAccount();
    setIsDeletingAccount(false);
    setIsConfirmingDelete(false);

    if (res.success) {
      setIsStoreProfileModalOpen(false);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <>
      {/* Account Settings Overlay */}
      <div 
        id="account-settings-modal-overlay"
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsStoreProfileModalOpen(false);
        }}
      >
        <div 
          id="account-settings-modal-container"
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="p-6 sm:p-7 pb-4 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                {isSeller ? <Store className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-sans text-xl font-bold text-stone-950">
                  {isSeller ? 'Boutique & Account Settings' : 'Buyer Account Settings'}
                </h3>
                <p className="text-xs text-stone-500 font-sans">Manage your profile details and account preferences</p>
              </div>
            </div>
            <button
              type="button"
              id="close-account-settings-modal-btn"
              onClick={() => setIsStoreProfileModalOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Display Name */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  id="edit-user-name-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                />
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Email Address <span className="font-normal text-stone-400">(Linked Account)</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 font-semibold cursor-not-allowed"
                />
              </div>

              {/* Profile Avatar Image */}
              <div>
                <label className="block font-semibold text-stone-800 mb-2">
                  Profile Avatar Image
                </label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={userAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-stone-300 shrink-0 bg-stone-100 shadow-sm"
                    />
                    <div className="flex flex-col gap-2 w-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full text-xs text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller-Specific Fields */}
              {isSeller && (
                <>
                  <div className="pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-amber-900">
                        Boutique / Store Name
                      </label>
                      <span className={`text-[10px] font-mono ${storeBoutiqueName.length >= 30 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                        {storeBoutiqueName.length}/30
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      id="edit-boutique-name-input"
                      value={storeBoutiqueName}
                      onChange={(e) => setStoreBoutiqueName(e.target.value)}
                      placeholder="e.g. Manila Vintage Vault"
                      className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-amber-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-800 mb-1">
                      Boutique Biography
                    </label>
                    <textarea
                      rows={5}
                      id="edit-boutique-bio-input"
                      value={storeBio}
                      onChange={(e) => {
                        setStoreBio(e.target.value);
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
                      placeholder="e.g. Curating 90s band tees, single-stitch denim, and rare Japanese outerwear."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none resize-none overflow-y-auto max-h-[300px]"
                    />
                  </div>
                </>
              )}

              {/* In-App Error Alert Banner */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsStoreProfileModalOpen(false)}
                  className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  id="save-account-settings-btn"
                  className="px-6 py-2.5 bg-stone-950 hover:bg-amber-950 text-amber-50 font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>

              {/* Danger Zone: Permanently Delete Account (Available for both Buyers and Sellers) */}
              <div className="pt-6 border-t border-red-200 mt-6 space-y-2">
                <div className="flex items-center justify-between p-3.5 bg-red-50/80 border border-red-200/90 rounded-2xl gap-3">
                  <div>
                    <p className="font-bold text-red-950 text-xs flex items-center gap-1.5 font-sans">
                      <Trash2 className="w-3.5 h-3.5 text-red-700" />
                      <span>Permanently Delete Account</span>
                    </p>
                    <p className="text-[11px] text-red-800/90 mt-0.5 leading-snug font-sans">
                      Irreversibly delete your profile, {isSeller ? 'listed garments,' : ''} order history, and account records.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="delete-account-btn"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {isConfirmingDelete && (
        <div 
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingAccount) setIsConfirmingDelete(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans text-lg font-bold text-stone-950">Delete Account Permanently?</h3>
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed font-sans">
              Are you sure you want to delete your account? All associated profile data, {isSeller ? 'listed thrift garments, sales history,' : 'purchased orders history,'} and login credentials will be <span className="font-bold text-red-700 font-sans">permanently removed</span> from our database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-account-btn"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <span>Yes, Delete Everything</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Crop Modal */}
      {isCropModalOpen && imageToCrop && (
        <div 
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-sm z-[70] flex flex-col items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setIsCropModalOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-lg max-h-[70vh] bg-stone-900 rounded-2xl overflow-y-auto border border-stone-800 shadow-2xl flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img 
                ref={imgRef} 
                src={imageToCrop} 
                alt="Crop preview" 
                className="max-h-[60vh] w-auto object-contain"
                onLoad={e => {
                  const { width, height } = e.currentTarget;
                  const size = Math.min(width, height);
                  const x = (width - size) / 2;
                  const y = (height - size) / 2;
                  setCrop({ unit: 'px', width: size, height: size, x, y });
                  setCompletedCrop({ unit: 'px', width: size, height: size, x, y });
                }}
              />
            </ReactCrop>
          </div>
          
          <div 
            className="mt-6 flex flex-col items-center gap-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4 w-full px-6">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showCroppedImage}
                disabled={isSaving}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSaving ? 'Cropping...' : 'Save Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};