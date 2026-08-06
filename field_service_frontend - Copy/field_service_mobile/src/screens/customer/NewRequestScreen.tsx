import { colors } from '../../theme/colors';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../../auth/useAuth';
import { customerApi } from '../../api/customer';
import client from '../../api/client';
import Card from '../../components/Card';
import { useNotification } from '../../providers/NotificationProvider';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { env } from '../../config/env';

// ── Validation rules — identical to frontend_react/src/utils/validation.js ──
const NAME_REGEX = /^[A-Za-z ]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+91[-\s]?)?[6-9]\d{9}$/;

export default function NewRequestScreen({ navigation }: any) {
  const { user } = useAuth();
  const notification = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null); // { uri, type, name }

  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Validation mirroring Web Dashboard.jsx
  const cityVal = city.trim();
  const stateVal = state.trim();
  const pincodeVal = pincode.trim();
  const latText = latitude.trim();
  const lonText = longitude.trim();

  const hasManualAddress = Boolean(cityVal && stateVal && /^\d{6}$/.test(pincodeVal));

  const latNum = Number(latText);
  const lonNum = Number(lonText);
  const hasGpsCoordinates = Boolean(
    latText && lonText &&
    Number.isFinite(latNum) && Number.isFinite(lonNum) &&
    latNum >= -90 && latNum <= 90 &&
    lonNum >= -180 && lonNum <= 180
  );

  const hasBothLocationModes = hasManualAddress && hasGpsCoordinates;
  const canSubmitLocation = (hasManualAddress || hasGpsCoordinates) && !hasBothLocationModes;

  // ── Per-field validation errors — mirrors Web validation.js exactly ──────────
  const nameVal = customerName.trim();
  const nameError =
    !nameVal ? 'Name is required' :
    nameVal.length < 3 ? 'Name must be at least 3 characters' :
    !NAME_REGEX.test(nameVal) ? 'Name must contain only alphabets and spaces' :
    '';

  const emailVal = customerEmail.trim();
  const emailError =
    !emailVal ? 'Email is required' :
    !EMAIL_REGEX.test(emailVal) ? 'Please enter a valid email address' :
    '';

  const contactVal = contact.trim();
  const contactError =
    !contactVal ? 'Contact number is required' :
    !PHONE_REGEX.test(contactVal) ? 'Phone must be +91XXXXXXXXXX or 10-digit Indian mobile' :
    '';

  // Description is optional — mirrors Web DescriptionInput ("Problem Description (Optional)")
  const isValid = Boolean(
    !nameError &&
    !emailError &&
    !contactError
  );

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      notification.warning({ message: 'Permission to access camera roll is required!' });
      return;
    }

    // allowsEditing removed — it requires CropImageActivity registered in AndroidManifest.
    // The plugin is absent from app.json so the Activity is unregistered, causing a crash.
    // Removing allowsEditing is the safe fix that preserves full picker functionality.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploadedFile({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || asset.uri.split('/').pop() || 'maintenance.jpg',
      });
    }
  };

  // Resolved human-readable address from reverse geocoding (mirrors Web LocationInput.jsx)
  const [resolvedAddress, setResolvedAddress] = useState('');

  const handleGetCurrentLocation = async () => {
    setIsLoading(true);
    setResolvedAddress('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notification.warning({ message: 'Permission to access location was denied.' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));

      // Reverse geocode — mirrors Web LocationInput.jsx applyResolvedCoordinates()
      try {
        const response = await client.get(`/location/reverse?lat=${lat}&lng=${lng}`, {
          timeout: 8000,
        });
        const data = response.data;
        const address = String(data?.formatted || '').trim();
        if (address) {
          setResolvedAddress(address);
        } else {
          setResolvedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      } catch (err: any) {
        console.log('Reverse geocode failed:', err?.message);
        // Reverse geocode failed — fall back to coordinate string
        setResolvedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err: any) {
      notification.error({ message: 'Failed to retrieve current location.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setDescription('');
    setContact('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPincode('');
    setLandmark('');
    setLatitude('');
    setLongitude('');
    setResolvedAddress('');
    setUploadedFile(null);
  };

  const onSubmit = async () => {
    if (!uploadedFile) {
      notification.warning({ message: 'Please upload a maintenance-related image before submitting.' });
      return;
    }

    if (hasBothLocationModes) {
      notification.warning({ message: 'Choose one location mode: manual address or valid GPS coordinates.' });
      return;
    }

    if (!hasGpsCoordinates && !hasManualAddress) {
      notification.warning({ message: 'Provide location using either manual address fields or valid GPS latitude and longitude.' });
      return;
    }

    let finalLocation = '';
    if (hasGpsCoordinates) {
      // Prefer reverse-geocoded address over raw coordinates — mirrors Web behavior
      finalLocation = resolvedAddress || `${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`;
    } else if (hasManualAddress) {
      const parts = [addressLine1, addressLine2, landmark, city, state, pincode].filter(p => p && p.trim() !== '');
      finalLocation = parts.join(', ');
    }

    setIsLoading(true);

    try {
      const formData = new FormData();

      const imageFile = {
        uri: uploadedFile.uri,
        type: uploadedFile.type || 'image/jpeg',
        name: uploadedFile.name || 'maintenance.jpg',
      };

      console.log('IMAGE URI:', imageFile.uri);
      console.log('IMAGE TYPE:', imageFile.type);
      console.log('IMAGE NAME:', imageFile.name);

      formData.append('image', imageFile as any);

      formData.append('description', description.trim());
      formData.append('location', finalLocation.trim());

      formData.append('contact', contact.trim());
      formData.append('customer_name', customerName.trim());
      formData.append('customer_email', customerEmail.trim());

      formData.append('address_line1', addressLine1.trim());
      formData.append('address_line2', addressLine2.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('pincode', pincode.trim());
      formData.append('landmark', landmark.trim());

      if (hasGpsCoordinates) {
        formData.append('latitude', latNum.toFixed(6));
        formData.append('longitude', lonNum.toFixed(6));
      }

      console.log('--- SUBMIT PAYLOAD AUDIT ---');
      console.log('description:', description);
      console.log('contact:', contact);
      console.log('customerName:', customerName);
      console.log('customerEmail:', customerEmail);
      console.log('addressLine1:', addressLine1);
      console.log('addressLine2:', addressLine2);
      console.log('city:', city);
      console.log('state:', state);
      console.log('pincode:', pincode);
      console.log('landmark:', landmark);
      console.log('hasGpsCoordinates:', hasGpsCoordinates);
      console.log('latNum:', latNum);
      console.log('lonNum:', lonNum);
      console.log('finalLocation:', finalLocation);
      console.log('uploadedFile:', uploadedFile);
      console.log('uploadedFile keys:', Object.keys(uploadedFile || {}));
      console.log('API URL:', customerApi);
      console.log('FINAL LOCATION:', finalLocation);
      console.log('IMAGE FILE:', imageFile);
      console.log('----------------------------');

      const result = await customerApi.reportIssue(formData);
      console.log('REPORT RESULT:', result);
      console.log('REPORT RESULT TYPE:', typeof result);
      // Mirror Web: Clear form and navigate to Dashboard with state
      handleReset();

      if (navigation?.navigate) {
        navigation.navigate('Dashboard', {
          submitSuccess: {
            requestId: result?.request_id || null,
            at: Date.now(),
          },
        });
      }
    } catch (err: any) {
      console.log('--- SUBMIT REQUEST ERROR AUDIT ---');
      console.log('Complete Axios Error Object:', err);
      console.log('err.message:', err.message);
      console.log('err.response?.status:', err.response?.status);
      console.log('err.response?.data:', err.response?.data);
      console.log('Validation Error Response:', JSON.stringify(err.response?.data, null, 2));
      console.log(
        'FULL AXIOS RESPONSE:',
        JSON.stringify(
          {
            status: err.response?.status,
            data: err.response?.data,
            headers: err.response?.headers,
          },
          null,
          2
        )
      );

      console.log(
        'FULL AXIOS REQUEST:',
        JSON.stringify(
          {
            url: err.config?.url,
            method: err.config?.method,
            baseURL: err.config?.baseURL,
            headers: err.config?.headers,
          },
          null,
          2
        )
      );
      console.log('err.config?.url:', err.config?.url);
      console.log('----------------------------------');

      const detail = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to submit service request.';
      notification.error({ message: detail });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Card title="Submit Service Request" subtitle="Upload an image and submit your request. Diagnosis details are processed for technician and admin workflows.">
        <View style={styles.formSpace}>

          {/* Image Upload — mirrors Web UploadCard ("Upload Fault Image *") */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Upload Fault Image *</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage}>
              {uploadedFile ? (
                <Text style={styles.uploadTextActive}>✓ {uploadedFile.name}</Text>
              ) : (
                <Text style={styles.uploadText}>Tap to select image (JPG or PNG, max 10MB)</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Description — Optional, mirrors Web DescriptionInput ("Problem Description (Optional)") */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Problem Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={5}
              placeholder="Describe the problem in detail...&#10;Example: Water flooding hospital ward due to drainage blockage"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Customer Details */}
          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <Text style={styles.sectionSubtitle}>Capture customer identity and service address for reliable dispatch.</Text>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Customer Name *</Text>
                <TextInput
                  style={[styles.input, nameError ? styles.inputError : null]}
                  placeholder="Enter customer name"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
                {nameError ? <Text style={styles.errorHint}>{nameError}</Text> : null}
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Customer Email *</Text>
                <TextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="Enter customer email"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {emailError ? <Text style={styles.errorHint}>{emailError}</Text> : null}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Address Line 1</Text>
              <TextInput style={styles.input} placeholder="House/Flat No, Building, Street" value={addressLine1} onChangeText={setAddressLine1} />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 4 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput style={styles.input} placeholder="State" value={state} onChangeText={setState} />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 4 }]}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput style={styles.input} placeholder="6-digit pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Landmark</Text>
              <TextInput style={styles.input} placeholder="Nearby landmark (optional)" value={landmark} onChangeText={setLandmark} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Address Line 2</Text>
              <TextInput style={styles.input} placeholder="Area, Locality" value={addressLine2} onChangeText={setAddressLine2} />
            </View>
          </View>

          {/* Location */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Location</Text>
              <TouchableOpacity onPress={handleGetCurrentLocation} disabled={isLoading}>
                <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600' }}>
                  {isLoading ? 'Waiting for GPS...' : 'Get GPS Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <TextInput style={styles.input} placeholder="Location address" value={resolvedAddress} onChangeText={setResolvedAddress} />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <TextInput style={styles.input} placeholder="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <TextInput style={styles.input} placeholder="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
              </View>
            </View>

            <Text style={{ fontSize: 12, color: colors.secondary.DEFAULT, marginTop: -8 }}>
              Use one location mode only: manual address (City, State, Pincode) or GPS location.
            </Text>
            
            {(!canSubmitLocation && (hasBothLocationModes || (hasManualAddress === false && hasGpsCoordinates === false))) && (
              <Text style={[styles.errorHint, { marginTop: 8 }]}>Choose exactly one location mode.</Text>
            )}
          </View>

          {/* Contact Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contact Number *</Text>
            {/* maxLength=13 covers +91 prefix (3 chars) + 10 digits — mirrors Web ContactInput maxLength={13} */}
            <TextInput
              style={[styles.input, contactError ? styles.inputError : null]}
              placeholder="e.g. 9876543210 or +919876543210"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              maxLength={13}
            />
            {contactError ? <Text style={styles.errorHint}>{contactError}</Text> : null}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            {uploadedFile && (
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={isLoading}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, (isLoading || !isValid || !uploadedFile || !canSubmitLocation) && styles.submitBtnDisabled]}
              onPress={onSubmit}
              disabled={isLoading || !isValid || !uploadedFile || !canSubmitLocation}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingTop: 48, paddingBottom: 60 },
  formSpace: { marginTop: 16 },
  fieldGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: colors.primary.DEFAULT, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, fontSize: 16, color: colors.textPrimary },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  uploadBox: { borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 8, padding: 32, alignItems: 'center', backgroundColor: '#f9fafb' },
  uploadText: { color: colors.secondary.DEFAULT, fontSize: 14 },
  uploadTextActive: { color: colors.success, fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.primary.DEFAULT, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: colors.secondary.DEFAULT, marginBottom: 16 },
  errorHint: { color: colors.danger, fontSize: 12, marginTop: 4, marginBottom: 0 },
  inputError: { borderColor: colors.danger },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  resetBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', marginRight: 12 },
  resetBtnText: { color: colors.primary.DEFAULT, fontWeight: '500', fontSize: 16 },
  submitBtn: { backgroundColor: colors.primary.DEFAULT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.card, fontWeight: '500', fontSize: 16 },
});
