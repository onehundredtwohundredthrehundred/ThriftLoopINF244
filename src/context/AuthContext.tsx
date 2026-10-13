import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import { sanitizeFirestoreData } from '../lib/firestoreUtils';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, deleteUser, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loginWithGoogle: (role?: UserRole, boutiqueName?: string) => Promise<{
        success: boolean;
        error?: string;
        cancelled?: boolean;
    }>;
    register: (name: string, email: string, password: string, role?: UserRole, boutiqueName?: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<{
        success: boolean;
        error?: string;
    }>;
    resetPassword: (email: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    switchRole: (role: UserRole) => Promise<void>;
    updateUserProfile: (updates: Partial<User>) => Promise<{
        success: boolean;
        error?: string;
    }>;
    isBoutiqueNameTaken: (boutiqueName: string, excludeUserId?: string) => Promise<boolean>;
    isAuthModalOpen: boolean;
    openAuthModal: (initialTab?: 'login' | 'register', defaultRole?: UserRole) => void;
    closeAuthModal: () => void;
    authModalTab: 'login' | 'register';
    authModalRole: UserRole;
    setAuthModalRole: (role: UserRole) => void;
    isLoadingAuth: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'register'> ('login');
    const [authModalRole, setAuthModalRole] = useState<UserRole>('buyer');
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                try {
                    const userDocRef = doc(db, 'users', fbUser.uid);
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data() as User;
                        setCurrentUser(data);
                    }
                    else {
                        const email = fbUser.email || 'user@thriftloop.store';
                        const namePart = fbUser.displayName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const newUser: User = {
                            id: fbUser.uid,
                            name: namePart || 'Vintage Collector',
                            email,
                            role: 'buyer',
                            avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                            joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                        };
                        await setDoc(userDocRef, sanitizeFirestoreData(newUser), { merge: true });
                        setCurrentUser(newUser);
                    }
                }
                catch (err) {
                    console.error('Error fetching Firestore user record:', err);
                }
            }
            else {
                setCurrentUser(null);
                localStorage.removeItem('thriftloop_user');
            }
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);
    const isBoutiqueNameTaken = async (boutiqueNameToCheck: string, excludeUserId?: string): Promise<boolean> => {
        const trimmed = boutiqueNameToCheck.trim().toLowerCase();
        if (!trimmed)
            return false;
        try {
            const usersRef = collection(db, 'users');
            const querySnap = await getDocs(usersRef);
            for (const docSnap of querySnap.docs) {
                if (excludeUserId && docSnap.id === excludeUserId)
                    continue;
                const data = docSnap.data();
                if (data && typeof data.boutiqueName === 'string') {
                    if (data.boutiqueName.trim().toLowerCase() === trimmed) {
                        return true;
                    }
                }
            }
        }
        catch (err) {
            console.error('Error checking boutique name uniqueness:', err);
        }
        return false;
    };
    const loginWithGoogle = async (role: UserRole = 'buyer', boutiqueName?: string): Promise<{
        success: boolean;
        error?: string;
        cancelled?: boolean;
    }> => {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const userCredential = await signInWithPopup(auth, provider);
            const fbUser = userCredential.user;
            const userDocRef = doc(db, 'users', fbUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                setCurrentUser(userData);
            }
            else {
                const namePart = fbUser.displayName || fbUser.email?.split('@')[0] || 'Vintage User';
                const isSeller = role === 'seller';
                if (isSeller && boutiqueName?.trim()) {
                    const chosenBoutique = boutiqueName.trim();
                    if (chosenBoutique.length > 30) {
                        return { success: false, error: 'Boutique name cannot exceed 30 characters.' };
                    }
                    if (chosenBoutique.length < 2) {
                        return { success: false, error: 'Boutique name must be at least 2 characters.' };
                    }
                    const taken = await isBoutiqueNameTaken(chosenBoutique);
                    if (taken) {
                        return {
                            success: false,
                            error: `The boutique name "${chosenBoutique}" is already taken by an existing store. Please choose a unique name.`
                        };
                    }
                }
                const newUser: User = {
                    id: fbUser.uid,
                    name: namePart,
                    email: fbUser.email || '',
                    role,
                    avatar: fbUser.photoURL || (isSeller
                        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
                        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'),
                    joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                };
                if (isSeller) {
                    newUser.boutiqueName = boutiqueName?.trim() || `${namePart}'s Vault`;
                    newUser.boutiqueBio = '';
                    newUser.rating = 0.0;
                    newUser.totalSales = 0;
                }
                await setDoc(userDocRef, sanitizeFirestoreData(newUser), { merge: true });
                setCurrentUser(newUser);
            }
            setIsAuthModalOpen(false);
            return { success: true };
        }
        catch (authErr: any) {
            if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
                console.info('Google Sign-In popup was closed by user.');
                return { success: false, cancelled: true };
            }
            if (authErr.code === 'auth/popup-blocked') {
                console.warn('Google Sign-In popup blocked by browser.');
                return { success: false, error: 'Sign in popup was blocked by your browser. Please allow popups for this site and try again.' };
            }
            console.error('Firebase Google Sign-In error:', authErr);
            return { success: false, error: authErr.message || 'Failed to sign in with Google.' };
        }
    };
    const login = async (email: string, password: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const fbUid = userCredential.user.uid;
            const userDocRef = doc(db, 'users', fbUid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                setCurrentUser(userData);
            }
            else {
                const namePart = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const newUser: User = {
                    id: fbUid,
                    name: namePart || 'Vintage Collector',
                    email: email.trim(),
                    role: 'buyer',
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                    joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                };
                await setDoc(userDocRef, sanitizeFirestoreData(newUser), { merge: true });
                setCurrentUser(newUser);
            }
            setIsAuthModalOpen(false);
            return { success: true };
        }
        catch (authErr: any) {
            const isOperationNotAllowed = authErr.code === 'auth/operation-not-allowed' ||
                (authErr.message && authErr.message.includes('operation-not-allowed'));
            if (isOperationNotAllowed) {
                console.warn('⚠️ Firebase Auth Warning: Email/Password sign-in is not enabled in your Firebase project. ' +
                    'To resolve this: Go to Firebase Console > Authentication > Sign-in method, click "Add new provider", ' +
                    'select "Email/Password", enable it, and save changes.');
            }
            else {
                console.error('Firebase Auth sign in error:', authErr);
            }
            let errorMsg = 'Invalid email or password. Please check your credentials or create an account.';
            if (isOperationNotAllowed) {
                errorMsg = 'Email/Password login is currently disabled in this project\'s Firebase setup. Please use "Continue with Google" or enable the Email/Password provider in the Firebase Console under Authentication > Sign-in method.';
            }
            else if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                errorMsg = 'No account found with this email or password is incorrect. Please register first.';
            }
            else if (authErr.code === 'auth/wrong-password') {
                errorMsg = 'Incorrect password. Please try again.';
            }
            else if (authErr.code === 'auth/invalid-email') {
                errorMsg = 'Please enter a valid email address.';
            }
            else if (authErr.message) {
                errorMsg = authErr.message;
            }
            return { success: false, error: errorMsg };
        }
    };
    const register = async (name: string, email: string, password: string, role: UserRole = 'buyer', boutiqueName?: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            if (role === 'seller') {
                const rawBoutique = boutiqueName?.trim() || `${name.trim()}'s Vault`;
                if (rawBoutique.length > 30) {
                    return { success: false, error: 'Boutique name cannot exceed 30 characters.' };
                }
                if (rawBoutique.length < 2) {
                    return { success: false, error: 'Boutique name must be at least 2 characters.' };
                }
                const taken = await isBoutiqueNameTaken(rawBoutique);
                if (taken) {
                    return {
                        success: false,
                        error: `The boutique name "${rawBoutique}" is already taken by another registered store. Please choose a unique name.`
                    };
                }
            }
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const fbUid = userCredential.user.uid;
            const newUser: User = {
                id: fbUid,
                name: name.trim(),
                email: email.trim(),
                role,
                avatar: role === 'seller'
                    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
                joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            };
            if (role === 'seller') {
                newUser.boutiqueName = boutiqueName?.trim() || `${name.trim()}'s Vault`;
                newUser.boutiqueBio = '';
                newUser.rating = 0.0;
                newUser.totalSales = 0;
            }
            const userDocRef = doc(db, 'users', fbUid);
            await setDoc(userDocRef, sanitizeFirestoreData(newUser));
            setCurrentUser(newUser);
            setIsAuthModalOpen(false);
            return { success: true };
        }
        catch (e: any) {
            const isOperationNotAllowed = e.code === 'auth/operation-not-allowed' ||
                (e.message && e.message.includes('operation-not-allowed'));
            if (isOperationNotAllowed) {
                console.warn('⚠️ Firebase Auth Warning: Email/Password sign-up is not enabled in your Firebase project. ' +
                    'To resolve this: Go to Firebase Console > Authentication > Sign-in method, click "Add new provider", ' +
                    'select "Email/Password", enable it, and save changes.');
            }
            else {
                console.error('Firebase registration error:', e);
            }
            let errorMsg = 'Failed to register account. Please try again.';
            if (isOperationNotAllowed) {
                errorMsg = 'Email/Password registration is currently disabled in this project\'s Firebase setup. Please use "Continue with Google" or enable the Email/Password provider in the Firebase Console under Authentication > Sign-in method.';
            }
            else if (e.code === 'auth/email-already-in-use') {
                errorMsg = 'An account with this email already exists. Please sign in instead.';
            }
            else if (e.code === 'auth/weak-password') {
                errorMsg = 'Password is too weak. Please use at least 6 characters.';
            }
            else if (e.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address provided.';
            }
            else if (e.message) {
                errorMsg = e.message;
            }
            return { success: false, error: errorMsg };
        }
    };
    const resetPassword = async (email: string): Promise<{
        success: boolean;
        error?: string;
    }> => {
        try {
            await sendPasswordResetEmail(auth, email.trim());
            return { success: true };
        }
        catch (e: any) {
            console.error('Password reset error:', e);
            let errorMsg = 'Failed to send password reset email.';
            if (e.code === 'auth/user-not-found') {
                errorMsg = 'No account exists with this email address.';
            }
            else if (e.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address.';
            }
            return { success: false, error: errorMsg };
        }
    };
    const logout = async () => {
        try {
            await signOut(auth);
        }
        catch (e) {
            console.warn('Sign out error:', e);
        }
        setCurrentUser(null);
        localStorage.removeItem('thriftloop_user');
        localStorage.removeItem('thriftloop_cart_guest');
        localStorage.removeItem('thriftloop_cart');
    };
    const deleteAccount = async (): Promise<{
        success: boolean;
        error?: string;
    }> => {
        if (!currentUser)
            return { success: false, error: 'Not authenticated' };
        try {
            const userId = currentUser.id;
            const userBoutique = currentUser.boutiqueName;
            await deleteDoc(doc(db, 'users', userId));
            const batch = writeBatch(db);
            let batchCount = 0;
            const pRef = collection(db, 'products');
            const pQuery = query(pRef, where('sellerId', '==', userId));
            const pSnaps = await getDocs(pQuery);
            pSnaps.forEach((pDoc) => {
                batch.delete(pDoc.ref);
                batchCount++;
            });
            if (userBoutique) {
                const pBoutiqueQuery = query(pRef, where('sellerBoutique', '==', userBoutique));
                const pBoutiqueSnaps = await getDocs(pBoutiqueQuery);
                pBoutiqueSnaps.forEach((pDoc) => {
                    batch.delete(pDoc.ref);
                    batchCount++;
                });
            }
            const oRef = collection(db, 'orders');
            const oQuery = query(oRef, where('buyerId', '==', userId));
            const oSnaps = await getDocs(oQuery);
            oSnaps.forEach((oDoc) => {
                batch.delete(oDoc.ref);
                batchCount++;
            });
            if (batchCount > 0) {
                await batch.commit();
            }
            const fbUser = auth.currentUser;
            if (fbUser) {
                try {
                    await deleteUser(fbUser);
                }
                catch (authErr: any) {
                    console.warn('Auth deleteUser warning:', authErr);
                    if (authErr.code === 'auth/requires-recent-login') {
                        await signOut(auth);
                        setCurrentUser(null);
                        return {
                            success: false,
                            error: 'Security Notice: Account deletion requires a fresh sign-in. Your data was removed, please log in again to finalize auth deletion.'
                        };
                    }
                }
            }
            else {
                await signOut(auth);
            }
            setCurrentUser(null);
            localStorage.removeItem('thriftloop_user');
            return { success: true };
        }
        catch (err: any) {
            console.error('Error deleting user account:', err);
            try {
                await signOut(auth);
            }
            catch (e) {
            }
            setCurrentUser(null);
            return { success: false, error: err.message || 'Failed to delete account' };
        }
    };
    const switchRole = async (newRole: UserRole) => {
        if (currentUser) {
            const updatedUser: User = {
                ...currentUser,
                role: newRole,
                boutiqueName: newRole === 'seller' && !currentUser.boutiqueName ? 'Curated Boutique' : currentUser.boutiqueName
            };
            setCurrentUser(updatedUser);
            try {
                const updatePayload: Record<string, any> = {
                    role: newRole,
                };
                if (updatedUser.boutiqueName) {
                    updatePayload.boutiqueName = updatedUser.boutiqueName;
                }
                await updateDoc(doc(db, 'users', currentUser.id), sanitizeFirestoreData(updatePayload));
            }
            catch (e) {
                console.warn('Role update sync:', e);
            }
        }
    };
    const updateUserProfile = async (updates: Partial<User>): Promise<{
        success: boolean;
        error?: string;
    }> => {
        if (!currentUser)
            return { success: false, error: 'Not authenticated' };
        if (updates.boutiqueName && currentUser.role === 'seller') {
            const trimmedName = updates.boutiqueName.trim();
            if (trimmedName.length > 30) {
                return { success: false, error: 'Boutique name cannot exceed 30 characters.' };
            }
            if (trimmedName.length < 2) {
                return { success: false, error: 'Boutique name must be at least 2 characters.' };
            }
            if (trimmedName.toLowerCase() !== (currentUser.boutiqueName || '').toLowerCase()) {
                const taken = await isBoutiqueNameTaken(trimmedName, currentUser.id);
                if (taken) {
                    return {
                        success: false,
                        error: `The boutique name "${trimmedName}" is already taken by another registered store. Please choose a unique name.`
                    };
                }
            }
            updates.boutiqueName = trimmedName;
        }
        const updatedUser: User = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);
        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, sanitizeFirestoreData(updates));
            return { success: true };
        }
        catch (err: any) {
            console.error('Error updating profile in Firestore:', err);
            return { success: false, error: err.message || 'Failed to update profile' };
        }
    };
    const openAuthModal = (tab: 'login' | 'register' = 'login', role: UserRole = 'buyer') => {
        setAuthModalTab(tab);
        setAuthModalRole(role);
        setIsAuthModalOpen(true);
    };
    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
    };
    return (<AuthContext.Provider value={{
            currentUser,
            isAuthenticated: !!currentUser,
            login,
            loginWithGoogle,
            register,
            logout,
            deleteAccount,
            resetPassword,
            switchRole,
            updateUserProfile,
            isBoutiqueNameTaken,
            isAuthModalOpen,
            openAuthModal,
            closeAuthModal,
            authModalTab,
            authModalRole,
            setAuthModalRole,
            isLoadingAuth,
        }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
