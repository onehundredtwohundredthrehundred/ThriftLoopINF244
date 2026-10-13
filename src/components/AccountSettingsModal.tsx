import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Store, User as UserIcon, RefreshCw, X, Trash2, Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

const createImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
});

async function getCroppedImg(imageSrc: string, pixelCrop: {
    width: number;
    height: number;
    x: number;
    y: number;
}): Promise<string | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return null;
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;
    croppedCtx.drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return croppedCanvas.toDataURL('image/jpeg', 0.9);
}

export const AccountSettingsModal: React.FC = () => {
    const { currentUser, updateUserProfile, deleteAccount } = useAuth();
    const { isStoreProfileModalOpen, setIsStoreProfileModalOpen, updateSellerProductsInfo } = useInventory();
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const [storeBoutiqueName, setStoreBoutiqueName] = useState('');
    const [storeBio, setStoreBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
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
            ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width * scaleX, completedCrop.height * scaleY);
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
        e.target.value = '';
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
          <div className="p-6 sm:p-7 pb-4 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                {isSeller ? <Store className="w-5 h-5"/> : <UserIcon className="w-5 h-5"/>}
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
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
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
                        className="text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isSeller && (
                <>
                  <div>
                    <label className="block font-semibold text-stone-800 mb-1">
                      Boutique Store Name
                    </label>
                    <input
                      type="text"
                      required
                      value={storeBoutiqueName}
                      onChange={(e) => setStoreBoutiqueName(e.target.value)}
                      placeholder="e.g., Vintage Vault"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-800 mb-1">
                      Boutique Bio & Description
                    </label>
                    <textarea
                      rows={3}
                      value={storeBio}
                      onChange={(e) => setStoreBio(e.target.value)}
                      placeholder="Tell buyers about your thrift store..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium text-stone-900 focus:ring-2 focus:ring-amber-800 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStoreProfileModalOpen(false)}
                  className="px-4 py-2.5 border border-stone-300 hover:bg-stone-100 rounded-xl font-semibold text-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-stone-200 space-y-3">
              <h4 className="font-bold text-red-950 text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-800" />
                <span>Danger Zone</span>
              </h4>
              <p className="text-[11px] text-stone-500 font-medium">
                Permanently delete your account and all associated profile data. This action cannot be undone.
              </p>

              {!isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <p className="text-xs font-bold text-red-950">
                    Are you absolutely sure you want to delete your account?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                      {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                      <span>Yes, Delete Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
};
