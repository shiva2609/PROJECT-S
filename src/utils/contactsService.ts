/**
 * Contacts Service
 * Handles contact permission, hashing, and upload to Firestore
 * Privacy: Only hashed phone numbers are uploaded
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { db } from '../api/authService';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Use crypto-js for React Native compatibility
let CryptoJS: any = null;
try {
  CryptoJS = require('crypto-js');
} catch {
  // Fallback: use a simple hash if crypto-js is not available
  console.warn('crypto-js not found. Install it for proper hashing: npm install crypto-js @types/crypto-js');
}

// Try to import contacts library (expo-contacts or react-native-contacts)
let Contacts: any = null;
try {
  Contacts = require('expo-contacts');
} catch {
  try {
    Contacts = require('react-native-contacts');
  } catch {
    console.warn('No contacts library found. Install expo-contacts or react-native-contacts for contacts features.');
  }
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('0')) {
    // Remove leading 0 (common in some countries)
    cleaned = cleaned.substring(1);
  }
  
  // If it starts with country code (e.g., 91 for India), keep it
  // Otherwise, assume it's a local number and might need country code
  // For now, return as-is if it has at least 10 digits
  if (cleaned.length >= 10) {
    return cleaned;
  }
  
  return null;
}

/**
 * Hash phone number using SHA256
 */
function hashPhoneNumber(phone: string): string {
  if (CryptoJS) {
    return CryptoJS.SHA256(phone).toString();
  }
  // Fallback: simple hash (not cryptographically secure, but works for development)
  // In production, ensure crypto-js is installed
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    const char = phone.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Request contacts permission
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    if (!Contacts) {
      Alert.alert('Contacts Not Available', 'Please install expo-contacts or react-native-contacts to use this feature.');
      return false;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message: 'Sanchari needs access to your contacts to find friends.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // iOS - expo-contacts
      if (Contacts.requestPermissionsAsync) {
        const { status } = await Contacts.requestPermissionsAsync();
        return status === 'granted';
      } else if (Contacts.requestPermission) {
        // react-native-contacts
        return await Contacts.requestPermission();
      }
      return false;
    }
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return false;
  }
}

/**
 * Check if contacts permission is granted
 */
export async function checkContactsPermission(): Promise<boolean> {
  try {
    if (!Contacts) return false;

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      return granted;
    } else {
      if (Contacts.getPermissionsAsync) {
        // expo-contacts
        const { status } = await Contacts.getPermissionsAsync();
        return status === 'granted';
      } else if (Contacts.checkPermission) {
        // react-native-contacts
        return await Contacts.checkPermission() === 'authorized';
      }
      return false;
    }
  } catch (error) {
    console.error('Error checking contacts permission:', error);
    return false;
  }
}

/**
 * Read contacts and hash phone numbers
 * Returns array of hashed phone numbers
 */
export async function readAndHashContacts(): Promise<string[]> {
  try {
    if (!Contacts) {
      throw new Error('Contacts library not available');
    }

    const hasPermission = await checkContactsPermission();
    if (!hasPermission) {
      throw new Error('Contacts permission not granted');
    }

    let contactsData: any[] = [];

    // Handle different contact library APIs
    if (Contacts.getContactsAsync) {
      // expo-contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      contactsData = data;
    } else if (Contacts.getAll) {
      // react-native-contacts
      contactsData = await Contacts.getAll();
    } else {
      throw new Error('Contacts library API not supported');
    }

    const hashedPhones: string[] = [];
    const seenPhones = new Set<string>();

    for (const contact of contactsData) {
      const phoneNumbers = contact.phoneNumbers || contact.phoneNumber || [];
      if (phoneNumbers.length > 0) {
        for (const phoneData of phoneNumbers) {
          const phoneNumber = phoneData.number || phoneData;
          const normalized = normalizePhoneNumber(phoneNumber || '');
          if (normalized && !seenPhones.has(normalized)) {
            seenPhones.add(normalized);
            const hashed = hashPhoneNumber(normalized);
            hashedPhones.push(hashed);
          }
        }
      }
    }

    return hashedPhones;
  } catch (error) {
    console.error('Error reading contacts:', error);
    throw error;
  }
}

/**
 * Upload hashed contacts to Firestore
 */
export async function uploadContactsHashes(userId: string, hashedPhones: string[]): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      contactsHash: hashedPhones,
      contactsHashUpdatedAt: Date.now(),
    });
    console.log(`✅ Uploaded ${hashedPhones.length} hashed contacts for user ${userId}`);
  } catch (error) {
    console.error('Error uploading contacts hashes:', error);
    throw error;
  }
}

/**
 * Remove contacts hashes from Firestore (revoke access)
 */
export async function removeContactsHashes(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      contactsHash: [],
      contactsHashUpdatedAt: null,
    });
    console.log(`✅ Removed contacts hashes for user ${userId}`);
  } catch (error) {
    console.error('Error removing contacts hashes:', error);
    throw error;
  }
}

/**
 * Check if user has uploaded contacts
 */
export async function hasUploadedContacts(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;
    
    const data = userDoc.data();
    return Array.isArray(data.contactsHash) && data.contactsHash.length > 0;
  } catch (error) {
    console.error('Error checking uploaded contacts:', error);
    return false;
  }
}

