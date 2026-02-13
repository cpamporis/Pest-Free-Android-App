// CustomersScreen.js (Updated with ScrollView)
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { launchImageLibrary } from 'react-native-image-picker';
import apiService, { API_BASE_URL } from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomerProfile from "./CustomerProfile";

/* ===================== EXISTING MODALS ===================== */

function CustomerSelectModal({ title, subtitle, customers, onClose, onSelect }) {
  return (
    <Modal animationType="slide" transparent visible>
      <SafeAreaView style={styles.modalSafeArea}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.selectCard}>
              <View style={styles.selectHeader}>
                <MaterialIcons name="people" size={28} color="#1f9c8b" />
                <Text style={styles.modalTitle}>{title}</Text>
                {!!subtitle && <Text style={styles.modalSub}>{subtitle}</Text>}
              </View>

              <ScrollView style={styles.selectList} showsVerticalScrollIndicator={false}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.customerId}
                    style={styles.selectItem}
                    onPress={() => onSelect(c)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectItemIcon}>
                      <FontAwesome5 name="building" size={16} color="#1f9c8b" />
                    </View>
                    <View style={styles.selectItemContent}>
                      <Text style={styles.selectItemTitle}>
                        {c.customerName}
                      </Text>
                      <View style={styles.selectItemMeta}>
                        <Text style={styles.selectItemId}>ID: {c.customerId}</Text>
                        {!!c.address && (
                          <View key="address-meta" style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={styles.selectItemDot}>•</Text>
                            <Text style={styles.selectItemSub}>{c.address}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={styles.cancelWide} 
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelWideText}>Cancel Selection</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

// UPDATED: AddCustomerModal with Image Upload (Gallery only)
function AddCustomerModal({ onClose, onSave }) {
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [telephone, setTelephone] = useState("");

  // Map upload states
  const [showMapUpload, setShowMapUpload] = useState(false);
  const [mapName, setMapName] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingMap, setUploadingMap] = useState(false);

  const selectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 1,
      });
      
      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
      } else if (result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to access image library');
    }
  };

  async function handleSave() {
    if (!customerName.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    // 🔐 Validate login fields
    if ((loginEmail && !loginPassword) || (!loginEmail && loginPassword)) {
      Alert.alert(
        "Incomplete login details",
        "Both login email and password are required."
      );
      return;
    }

    setLoading(true);

    try {
      const customerData = {
        customerName: customerName.trim(),
        address: address.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        maps: []
      };

      const createResult = await apiService.createCustomer(customerData);

      if (!createResult?.success) {
        throw new Error(createResult?.error || "Failed to create customer");
      }

      const created = createResult.customer;

      if (loginEmail && loginPassword) {
        await apiService.createCustomerLogin(created.customerId, {
          email: loginEmail,
          password: loginPassword
        });
      }

      setCreatedCustomer(created);
      onSave(created);

      Alert.alert(
        "Customer created",
        loginEmail
          ? "Customer and login account created successfully."
          : "Customer created. No login account was created."
      );

    } catch (e) {
      if (e?.status === 409) {
        Alert.alert(
          "Login already exists",
          "This customer already has a login account."
        );
      } else {
        Alert.alert("Error", e?.message || "Failed to create customer.");
      }
    } finally {
      setLoading(false);
    }
  }

  const uploadMapImage = async () => {
    if (!createdCustomer) {
      Alert.alert("Error", "Customer must be created first");
      return;
    }

    if (!selectedImage) {
      Alert.alert("Error", "Please select an image");
      return;
    }

    if (!mapName.trim()) {
      Alert.alert("Error", "Please enter a map name");
      return;
    }

    setUploadingMap(true);

    const formData = new FormData();
    formData.append("image", {
      uri: selectedImage.uri,
      type: selectedImage.type || "image/jpeg",
      name: selectedImage.fileName || `map_${Date.now()}.jpg`,
    });
    formData.append("customerId", createdCustomer.customerId);
    formData.append("mapName", mapName.trim());

    try {
      const token = await AsyncStorage.getItem("authToken");

      const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });


      const result = await response.json();

      if (result.success) {
        Alert.alert("Success", "Map uploaded successfully");

        setSelectedImage(null);
        setMapName("");
        setShowMapUpload(false);
      } else {
        Alert.alert("Error", result.error || "Upload failed");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload map");
    } finally {
      setUploadingMap(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible>
      <SafeAreaView style={styles.modalSafeArea}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="person-add" size={24} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Add New Customer</Text>
                <Text style={styles.modalSubtitle}>
                  Enter customer details below
                </Text>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Customer Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Porfi Hotel"
                    placeholderTextColor="#999"
                    value={customerName}
                    onChangeText={setCustomerName}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 123 Hotel Street, Athens"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. info@company.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Telephone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+30 69XXXXXXXX"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={telephone}
                  onChangeText={setTelephone}
                  editable={!loading}
                />
              </View>

                <Text style={styles.sectionTitle}>Login Account (Optional)</Text>
                <Text style={styles.sectionDescription}>
                  Create login credentials for customer portal access
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Login Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="customer@domain.com"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Initial Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Create secure password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    editable={!loading}
                  />
                </View>

                {/* MAP UPLOAD SECTION */}
                <Text style={styles.sectionTitle}>Maps & Layouts</Text>
                <Text style={styles.sectionDescription}>
                  Upload location maps after customer is created
                </Text>

                {!createdCustomer && (
                  <View style={styles.infoBox}>
                    <MaterialIcons name="info" size={18} color="#1f9c8b" />
                    <Text style={styles.infoText}>
                      Save customer first to add maps
                    </Text>
                  </View>
                )}

                {createdCustomer && !showMapUpload && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setShowMapUpload(true)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add-photo-alternate" size={18} color="#1f9c8b" />
                    <Text style={styles.secondaryButtonText}>Add Map</Text>
                  </TouchableOpacity>
                )}

                {createdCustomer && showMapUpload && (
                  <View style={styles.mapUploadContainer}>
                    {selectedImage && (
                      <View style={styles.imagePreviewContainer}>
                        <Image
                          source={{ uri: selectedImage.uri }}
                          style={styles.imagePreview}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          style={styles.changeImageBtn}
                          onPress={() => setSelectedImage(null)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.changeImageText}>Change Image</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!selectedImage && (
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={selectImage}
                        disabled={uploadingMap}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="photo-library" size={18} color="#1f9c8b" />
                        <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Map Name <Text style={styles.requiredStar}>*</Text></Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Ground Floor"
                        placeholderTextColor="#999"
                        value={mapName}
                        onChangeText={setMapName}
                        editable={!uploadingMap}
                      />
                    </View>

                    <View style={styles.mapUploadButtons}>
                      <TouchableOpacity
                        style={[styles.primaryButton, { flex: 1, marginRight: 10 }]}
                        onPress={uploadMapImage}
                        disabled={uploadingMap}
                        activeOpacity={0.7}
                      >
                        {uploadingMap ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="cloud-upload" size={18} color="#fff" />
                            <Text style={styles.primaryButtonText}>Upload Map</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cancelButton, { flex: 1 }]}
                        onPress={() => {
                          setShowMapUpload(false);
                          setSelectedImage(null);
                          setMapName("");
                        }}
                        disabled={uploadingMap}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, loading && { opacity: 0.7 }]}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, loading && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Customer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

// UPDATED: EditCustomerModal with Image Upload (Gallery only)
function EditCustomerModal({ customer, onClose, onSave }) {
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [telephone, setTelephone] = useState("");

  
  // Map upload states
  const [showMapUpload, setShowMapUpload] = useState(false);
  const [mapName, setMapName] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [customerMaps, setCustomerMaps] = useState([]);

  
  useEffect(() => {
    let isMounted = true;

    async function loadCustomer() {
      try {
        setLoading(true);

        const res = await apiService.getCustomerById(customer.customerId);

        if (!res || res.success === false || !res.data) {
          throw new Error("Invalid customer response");
        }

        const fresh = res.data;

        if (!isMounted) return;

        setCustomerName(fresh.customerName || "");
        setAddress(fresh.address || "");
        setEmail(fresh.email || "");
        setTelephone(fresh.telephone || "");
        setCustomerMaps(fresh.maps || []);
      } catch (e) {
        console.error("❌ Failed to load customer:", e);
        Alert.alert("Error", "Failed to load customer data");
        onClose();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [customer.customerId]);


  const selectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 1,
      });
      
      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
      } else if (result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to access image library');
    }
  };

  const uploadMapImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!mapName.trim()) {
      Alert.alert('Error', 'Please enter a map name');
      return;
    }

    setUploadingMap(true);
    
    const formData = new FormData();
    formData.append('image', {
      uri: selectedImage.uri,
      type: selectedImage.type || 'image/jpeg',
      name: selectedImage.fileName || `map_${Date.now()}.jpg`,
    });
    formData.append('customerId', customer.customerId);
    formData.append('mapName', mapName.trim());

    try {
      const token = await AsyncStorage.getItem("authToken");

      const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setCustomerMaps(prev => [...prev, result.map]);

        setSelectedImage(null);
        setMapName("");
        setShowMapUpload(false);

        Alert.alert("Success", "Map added successfully!");
      } else {
        Alert.alert("Error", result.error || "Upload failed");
      }

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingMap(false);
    }
  };

  const removeMap = async (map) => {
    Alert.alert(
      "Delete Map",
      `Are you sure you want to delete "${map.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await apiService.deleteCustomerMap(
                customer.customerId,
                map.mapId
              );

              if (!result?.success) {
                throw new Error(result?.error || "Delete failed");
              }

              setCustomerMaps(prev =>
                prev.filter(m => m.mapId !== map.mapId)
              );

              Alert.alert("Success", "Map deleted successfully");
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to delete map");
            }
          }
        }
      ]
    );
  };

  async function handleSave() {
    if (!customerName.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        customerId: customer.customerId,
        customerName: customerName.trim(),
        address: address.trim(),
        email: email.trim(),
        telephone: telephone.trim()
      };

      await onSave(updateData);
      onClose();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to update customer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible>
      <SafeAreaView style={styles.modalSafeArea}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="edit" size={24} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Edit Customer</Text>
                <Text style={styles.modalSubtitle}>
                  Customer ID: {customer.customerId}
                </Text>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Customer Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Customer Name"
                    placeholderTextColor="#999"
                    value={customerName}
                    onChangeText={setCustomerName}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Address"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Telephone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+30 69XXXXXXXX"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={telephone}
                    onChangeText={setTelephone}
                    editable={!loading}
                  />
                </View>

                {/* MAPS SECTION */}
                <Text style={styles.sectionTitle}>Customer Maps</Text>
                
                {customerMaps.length > 0 && (
                  <View style={styles.mapsList}>
                    <Text style={styles.mapsListTitle}>Current Maps ({customerMaps.length})</Text>
                    {customerMaps.map((map) => (
                      <View key={map.mapId} style={styles.mapItem}>
                        <View style={styles.mapItemInfo}>
                          <MaterialIcons name="map" size={16} color="#1f9c8b" />
                          <Text style={styles.mapItemName}>{map.name}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.removeMapBtn}
                          onPress={() => removeMap(map)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="delete" size={16} color="#F44336" />
                          <Text style={styles.removeMapText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {!showMapUpload && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowMapUpload(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add-photo-alternate" size={18} color="#1f9c8b" />
                  <Text style={styles.secondaryButtonText}>Add New Map</Text>
                </TouchableOpacity>
                )}

                {showMapUpload && (
                  <View style={styles.mapUploadContainer}>
                    {selectedImage && (
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: selectedImage.uri }}
                          style={styles.imagePreview}
                          resizeMode="contain"
                        />
                        <TouchableOpacity 
                          style={styles.changeImageBtn}
                          onPress={() => setSelectedImage(null)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.changeImageText}>Change Image</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!selectedImage && (
                      <TouchableOpacity 
                        style={styles.secondaryButton}
                        onPress={selectImage}
                        disabled={uploadingMap}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="photo-library" size={18} color="#1f9c8b" />
                        <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Map Name <Text style={styles.requiredStar}>*</Text></Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Ground Floor, Storage Area, etc."
                        placeholderTextColor="#999"
                        value={mapName}
                        onChangeText={setMapName}
                        editable={!uploadingMap}
                      />
                    </View>

                    <View style={styles.mapUploadButtons}>
                      <TouchableOpacity
                        style={[styles.primaryButton, { flex: 1, marginRight: 10 }]}
                        onPress={uploadMapImage}
                        disabled={uploadingMap}
                        activeOpacity={0.7}
                      >
                        {uploadingMap ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="cloud-upload" size={18} color="#fff" />
                            <Text style={styles.primaryButtonText}>Upload Map</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cancelButton, { flex: 1 }]}
                        onPress={() => {
                          setShowMapUpload(false);
                          setSelectedImage(null);
                          setMapName("");
                        }}
                        disabled={uploadingMap}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, loading && { opacity: 0.7 }]}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, loading && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

function DeleteCustomerModal({ customerName, onClose, onConfirm }) {
  return (
    <Modal animationType="fade" transparent visible>
      <SafeAreaView style={styles.modalSafeArea}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconContainer}>
                <MaterialIcons name="warning" size={40} color="#1f9c8b" />
              </View>
              <Text style={styles.confirmTitle}>Remove Customer</Text>
              <Text style={styles.confirmText}>
                Are you sure you want to remove{" "}
                <Text style={{ fontWeight: "bold", color: "#1f9c8b" }}>{customerName}</Text>?
              </Text>
              <Text style={styles.confirmWarning}>
                This action removes all associated maps and stations of that customer, but they may be recovered
              </Text>

              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={onConfirm}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete" size={18} color="#fff" />
                  <Text style={styles.confirmDeleteButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

/* ===================== MAIN SCREEN ===================== */

export default function CustomersScreen({ onClose, onOpenReport }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSelectForEdit, setShowSelectForEdit] = useState(false);
  const [showSelectForDelete, setShowSelectForDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerStats, setCustomerStats] = useState([]);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reportToOpen, setReportToOpen] = useState(null);
  const [showSelectForRestore, setShowSelectForRestore] = useState(false);
  const [showSelectForPermanentDelete, setShowSelectForPermanentDelete] = useState(false);
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [showDeletedCustomers, setShowDeletedCustomers] = useState(false);
  

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (reportToOpen) {
      console.log("📄 Opening report from CustomersScreen:", reportToOpen);
      
      // Close the customer profile modal first
      setShowCustomerProfile(false);
      setSelectedCustomer(null);
      
      // Small delay to ensure modal is closed
      setTimeout(() => {
        if (onOpenReport) {
          onOpenReport(reportToOpen);
        }
        setReportToOpen(null); // Reset
      }, 100);
    }
  }, [reportToOpen, onOpenReport]);

  const handleOpenReportFromProfile = (visitData) => {
    console.log("📄 Passing through report data:", visitData);
    // Let CustomerProfile handle everything
  };

  async function loadCustomers() {
    setLoading(true);
    try {
      const customersRes = await apiService.getCustomers();
      if (!Array.isArray(customersRes)) {
        throw new Error("Invalid customers response");
      }

      const statsRes = await apiService.getCustomerStats();
      const stats = statsRes?.stats || [];

      // Merge stats into customers
      const mergedCustomers = customersRes.map(c => {
        const stat = stats.find(s => s.customerId === c.customerId);
        return {
          ...c,
          mapsCount: stat ? Number(stat.mapsCount) : 0,
          stationsCount: stat ? Number(stat.stationsCount) : 0
        };
      });

      console.log("🔍 CustomersScreen - onOpenReport prop type:", typeof onOpenReport);
      console.log("🔍 CustomersScreen - onOpenReport prop available:", !!onOpenReport);

      setCustomers(mergedCustomers);
      setCustomerStats(stats);
      await loadDeletedCustomers();

    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  const loadDeletedCustomers = async () => {
    try {
      console.log("📋 Loading deleted customers...");
      const result = await apiService.getDeletedCustomers();
      
      if (result?.success && Array.isArray(result.data)) {
        setDeletedCustomers(result.data);
        console.log(`✅ Loaded ${result.data.length} deleted customers`);
      } else {
        console.warn("⚠️ No deleted customers found");
        setDeletedCustomers([]);
      }
    } catch (e) {
      console.error("❌ Failed to load deleted customers:", e);
      Alert.alert("Error", "Failed to load deleted customers");
      setDeletedCustomers([]);
    }
  };

  function handleAddCustomer(newCustomer) {
    setCustomers(prev => [newCustomer, ...prev]);
  }

  async function handleEditCustomer(data) {
    try {
      console.log('📝 Updating customer via API:', data.customerId);
      
      // Call the API to update the customer
      const result = await apiService.updateCustomer(data.customerId, data);
      
      console.log('API update response:', result);
      
      if (!result?.success) {
        // Check if result has success property
        if (result && result.success === false) {
          throw new Error(result.error || "Failed to update customer");
        }
        // If result doesn't have success property but has customer data, it's OK
        if (!result.customer) {
          throw new Error("Invalid response from server");
        }
      }
      
      // Refresh the list
      await loadCustomers();
      
      return result;
    } catch (e) {
      console.error('Edit customer error:', e);
      throw e; // Re-throw to show error in modal
    }
  }
  
  async function handleSoftDeleteCustomer() {
    if (!selectedCustomer) return;
    
    console.log('Soft deleting customer:', selectedCustomer.customerId);
    
    try {
      const result = await apiService.softDeleteCustomer(selectedCustomer.customerId);
      
      console.log('Soft delete API result:', result);
      
      if (result && result.success) {
        Alert.alert("Success", "Customer moved to deleted list");
        setShowDeleteConfirm(false);
        setSelectedCustomer(null);
        
        // Refresh both active and deleted lists
        await loadCustomers();
      } else {
        Alert.alert("Error", result?.error || "Failed to delete customer");
      }
    } catch (error) {
      console.error('Soft delete customer error:', error);
      Alert.alert("Error", error.message || "Failed to delete customer");
    }
  }

  async function handleRestoreCustomer(customer) {
    console.log('Restoring customer:', customer.customerId);
    
    try {
      const result = await apiService.restoreCustomer(customer.customerId);
      
      if (result && result.success) {
        Alert.alert("Success", "Customer restored successfully");
        
        // Refresh both active and deleted lists
        await loadCustomers();
        setShowSelectForRestore(false);
      } else {
        Alert.alert("Error", result?.error || "Failed to restore customer");
      }
    } catch (error) {
      console.error('Restore customer error:', error);
      Alert.alert("Error", error.message || "Failed to restore customer");
    }
  }

  async function handlePermanentDeleteCustomer() {
    if (!selectedCustomer) return;
    
    Alert.alert(
      "Permanent Delete",
      `Are you ABSOLUTELY sure you want to PERMANENTLY delete "${selectedCustomer.customerName}"?\n\nThis action CANNOT be undone!`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Permanently Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await apiService.permanentDeleteCustomer(selectedCustomer.customerId);
              
              if (result && result.success) {
                Alert.alert("Success", "Customer permanently deleted");
                setShowSelectForPermanentDelete(false);
                setSelectedCustomer(null);
                
                // Refresh deleted customers list
                await loadDeletedCustomers();
              } else {
                Alert.alert("Error", result?.error || "Failed to permanently delete customer");
              }
            } catch (error) {
              console.error('Permanent delete customer error:', error);
              Alert.alert("Error", error.message || "Failed to permanently delete customer");
            }
          }
        }
      ]
    );
  }

  // Calculate stats
  const totalMaps = customers.reduce(
    (sum, c) => sum + (c.mapsCount || 0),
    0
  );

  const totalStations = customers.reduce(
    (sum, c) => sum + (c.stationsCount || 0),
    0
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>Loading Customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.adminBadge}>
                <MaterialIcons name="people" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>CUSTOMERS</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Customer Management</Text>
            <Text style={styles.title}>Manage Customer Accounts</Text>
            <Text style={styles.subtitle}>
              Create, edit, and manage customer profiles and locations
            </Text>
          </View>
        </View>

        {/* STATS BAR */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <FontAwesome5 name="users" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="map" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{totalMaps}</Text>
            <Text style={styles.statLabel}>Location Maps</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="location-pin" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{totalStations}</Text>
            <Text style={styles.statLabel}>Total Stations</Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="tune" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Customer Actions</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadCustomers}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#1f9c8b" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#1f9c8b" }]}
            onPress={() => setShowAdd(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="person-add" size={28} color="#fff" />
            <Text style={styles.actionCardTitle}>Add Customer</Text>
            <Text style={styles.actionCardDescription}>
              Create new customer profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#1f9c8b" }]}
            onPress={() => {
              if (customers.length === 0) return Alert.alert("No customers", "There are no customers to edit.");
              setShowSelectForEdit(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={28} color="#fff" />
            <Text style={styles.actionCardTitle}>Edit Customer</Text>
            <Text style={styles.actionCardDescription}>
              Modify existing customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#1f9c8b" }]}
            onPress={() => {
              if (customers.length === 0) return Alert.alert("No customers", "There are no customers to delete.");
              setShowSelectForDelete(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete" size={28} color="#fff" />
            <Text style={styles.actionCardTitle}>Remove Customer</Text>
            <Text style={styles.actionCardDescription}>
              Remove customer permanently
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#1f9c8b" }]}
            onPress={() => {
              if (deletedCustomers.length === 0) {
                Alert.alert("No deleted customers", "There are no deleted customers to restore.");
                return;
              }
              setShowSelectForRestore(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="restore" size={28} color="#fff" />
            <Text style={styles.actionCardTitle}>Restore Customer</Text>
            <Text style={styles.actionCardDescription}>
              Restore from deleted list
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#1f9c8b" }]}
            onPress={() => {
              if (deletedCustomers.length === 0) {
                Alert.alert("No deleted customers", "There are no deleted customers to permanently delete.");
                return;
              }
              setShowSelectForPermanentDelete(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-forever" size={28} color="#fff" />
            <Text style={styles.actionCardTitle}>Permanent Delete</Text>
            <Text style={styles.actionCardDescription}>
              Remove permanently
            </Text>
          </TouchableOpacity>
        </View>

        {/* CUSTOMER LIST */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="list-alt" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Customer Directory</Text>
          </View>
          <Text style={styles.countBadge}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="people-outline" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>No Customers Found</Text>
            <Text style={styles.emptyStateText}>
              Start by adding your first customer to the system
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowAdd(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="person-add" size={18} color="#fff" />
              <Text style={styles.emptyStateButtonText}>Add First Customer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {customers.map((c) => (
              <TouchableOpacity
                key={c.customerId}
                style={styles.customerCard}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCustomer(c);
                  setShowCustomerProfile(true);
                }}
              >
                <View style={styles.customerHeader}>
                  <View style={styles.customerAvatar}>
                    <FontAwesome5 name="building" size={22} color="#fff" />
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{c.customerName}</Text>
                    <View style={styles.customerMeta}>
                      <View style={styles.customerMetaItem}>
                        <MaterialIcons name="fingerprint" size={12} color="#666" />
                        <Text style={styles.customerMetaText}>ID: {c.customerId}</Text>
                      </View>
                      {c.address && (
                        <View style={styles.customerMetaItem}>
                          <MaterialIcons name="location-on" size={12} color="#666" />
                          <Text style={styles.customerMetaText}>{c.address}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.customerStats}>
                    <View style={styles.customerStat}>
                      <MaterialIcons name="map" size={14} color="#1f9c8b" />
                      <Text style={styles.customerStatText}>{c.mapsCount}</Text>
                    </View>
                    <View style={styles.customerStat}>
                      <MaterialIcons name="location-pin" size={14} color="#1f9c8b" />
                      <Text style={styles.customerStatText}>{c.stationsCount}</Text>
                    </View>
                  </View>
                </View>
                
                {c.email && (
                  <View style={styles.customerFooter}>
                    <MaterialIcons name="email" size={14} color="#666" />
                    <Text style={styles.customerEmail}>{c.email}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ===== DELETED CUSTOMERS SECTION ===== */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="delete-outline" size={20} color="#95a5a6" />
            <Text style={[styles.sectionTitle, { color: '#95a5a6' }]}>
              Deleted Customers
            </Text>
          </View>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowDeletedCustomers(!showDeletedCustomers)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleButtonText}>
              {showDeletedCustomers ? 'Hide' : 'Show'} ({deletedCustomers.length})
            </Text>
            <MaterialIcons 
              name={showDeletedCustomers ? "expand-less" : "expand-more"} 
              size={18} 
              color="#95a5a6" 
            />
          </TouchableOpacity>
        </View>

        {showDeletedCustomers && (
          <View style={styles.deletedCustomersSection}>
            {deletedCustomers.length === 0 ? (
              <View style={styles.emptyDeletedState}>
                <MaterialIcons name="delete-sweep" size={40} color="#ddd" />
                <Text style={styles.emptyDeletedText}>No deleted customers</Text>
              </View>
            ) : (
              <View style={styles.deletedListContainer}>
                {deletedCustomers.map((c) => (
                  <View key={c.customerId} style={styles.deletedCustomerCard}>
                    <View style={styles.deletedCustomerHeader}>
                      <View style={styles.deletedCustomerAvatar}>
                        <FontAwesome5 name="building" size={16} color="#fff" />
                      </View>
                      <View style={styles.deletedCustomerInfo}>
                        <Text style={styles.deletedCustomerName}>{c.customerName}</Text>
                        <View style={styles.deletedCustomerMeta}>
                          <Text style={styles.deletedCustomerId}>ID: {c.customerId}</Text>
                          <Text style={styles.deletedDate}>
                            Deleted: {new Date(c.deletedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.deletedCustomerActions}>
                      <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={() => handleRestoreCustomer(c)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="restore" size={16} color="#1f9c8b" />
                        <Text style={styles.restoreButtonText}>Restore</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.permanentDeleteButton}
                        onPress={() => {
                          setSelectedCustomer(c);
                          setShowSelectForPermanentDelete(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="delete-forever" size={16} color="#e74c3c" />
                        <Text style={styles.permanentDeleteButtonText}>Delete Forever</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Customer Management System</Text>
          <Text style={styles.footerSubtext}>
             Version 1.0 • Last updated: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.footerCopyright}>
             © {new Date().getFullYear()} Pest-Free. All rights reserved. 
          </Text>
        </View>
      </ScrollView>

      {/* MODALS */}
      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            try {
              await handleAddCustomer(data);
              Alert.alert("Success", "Customer created successfully!");
              setShowAdd(false);
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to create customer");
            }
          }}
        />
      )}

      {showSelectForEdit && (
        <CustomerSelectModal
          title="Select Customer to Edit"
          subtitle="Choose a customer from the list"
          customers={customers}
          onClose={() => setShowSelectForEdit(false)}
          onSelect={(c) => {
            setSelectedCustomer(c);
            setShowSelectForEdit(false);
            setShowEdit(true);
          }}
        />
      )}

      {showEdit && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEdit(false);
            setSelectedCustomer(null);
          }}
          onSave={async (data) => {
            try {
              await handleEditCustomer(data);
              Alert.alert("Success", "Customer updated successfully!");
              setShowEdit(false);
              setSelectedCustomer(null);
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to update customer");
            }
          }}
        />
      )}

      {/* Customer Profile Modal */}
      {showCustomerProfile && selectedCustomer && (
        <Modal animationType="slide" visible>
          <CustomerProfile
            customer={selectedCustomer}
            onClose={() => setShowCustomerProfile(false)}
            onOpenReport={handleOpenReportFromProfile} // Simple pass-through
          />
        </Modal>
      )}

      {showSelectForDelete && (
        <CustomerSelectModal
          title="Select Customer to Delete"
          subtitle="Choose a customer from the list"
          customers={customers}
          onClose={() => setShowSelectForDelete(false)}
          onSelect={(c) => {
            setSelectedCustomer(c);
            setShowSelectForDelete(false);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {showDeleteConfirm && selectedCustomer && (
        <DeleteCustomerModal
          customerName={selectedCustomer.customerName}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedCustomer(null);
          }}
          onConfirm={handleSoftDeleteCustomer}
        />
      )}

      {showSelectForRestore && (
        <CustomerSelectModal
          title="Select Customer to Restore"
          subtitle="Choose a deleted customer to restore"
          customers={deletedCustomers}
          onClose={() => setShowSelectForRestore(false)}
          onSelect={(c) => handleRestoreCustomer(c)}
        />
      )}

      {showSelectForPermanentDelete && deletedCustomers.length > 0 && (
        <CustomerSelectModal
          title="Select Customer to Delete Permanently"
          subtitle="Warning: This action cannot be undone!"
          customers={deletedCustomers}
          onClose={() => setShowSelectForPermanentDelete(false)}
          onSelect={(c) => {
            setSelectedCustomer(c);
            Alert.alert(
              "Confirm Permanent Delete",
              `Are you ABSOLUTELY sure you want to PERMANENTLY delete "${c.customerName}"?\n\nThis will remove all customer data including appointments, maps, and stations.`,
              [
                { text: "Cancel", style: "cancel", onPress: () => setShowSelectForPermanentDelete(false) },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: () => handlePermanentDeleteCustomer()
                }
              ]
            );
          }}
        />
      )}

    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40, // Extra padding at bottom for scrolling
  },
  
  // HEADER
  header: {
    backgroundColor: "#1f9c8b",
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 50,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  adminBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    fontFamily: 'System',
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    fontFamily: 'System',
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
    fontFamily: 'System',
  },
  
  // STATS BAR
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: -16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'System',
  },
  statDivider: {
    width: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 10,
  },
  
  // SECTION HEADER
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    marginHorizontal: 24,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  countBadge: {
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1f9c8b",
  },
  refreshButtonText: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  
  // ACTIONS GRID
  actionsGrid: {
  flexDirection: "column",
  paddingHorizontal: 10, // Less padding
  marginBottom: 20,
  gap: 8, // Even smaller gap
},
actionCard: {
  width: "100%",
  borderRadius: 10,
  padding: 10, // Even less padding
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
  minHeight: 60, // Even shorter
  justifyContent: "center",
},
actionCardContent: {
  alignItems: "center",
},
actionCardIcon: {
  marginBottom: 6, // Less space
},
actionCardTitle: {
  fontSize: 14, // Smaller
  fontWeight: "700",
  color: "#fff",
  marginBottom: 2, // Less margin
  textAlign: "center",
  fontFamily: 'System',
},
actionCardDescription: {
  fontSize: 10, // Smaller
  color: "rgba(255, 255, 255, 0.85)",
  textAlign: "center",
  fontFamily: 'System',
  lineHeight: 12,
},
  
  // CUSTOMER LIST
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  customerMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  customerMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  customerMetaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontFamily: 'System',
  },
  customerStats: {
    flexDirection: "row",
    gap: 12,
  },
  customerStat: {
    alignItems: "center",
  },
  customerStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c3e50",
    marginTop: 2,
    fontFamily: 'System',
  },
  customerFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f8f9fa",
  },
  customerEmail: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // EMPTY STATE
  emptyState: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
    fontFamily: 'System',
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f9c8b",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System',
  },

  // FOOTER
  footer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    fontFamily: 'System',
  },
  footerSubtext: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
    fontFamily: 'System',
  },
  footerCopyright: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: 'System',
  },
  
  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontFamily: 'System',
    fontWeight: '500',
  },
  
  // MODAL STYLES
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#0008",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "90%",
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    backgroundColor: "#1f9c8b",
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    fontFamily: 'System',
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: 'System',
    textAlign: "center",
  },
  modalForm: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginTop: 8,
    marginBottom: 8,
    fontFamily: 'System',
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    fontFamily: 'System',
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e9f7f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: "#1f9c8b",
    marginLeft: 8,
    fontFamily: 'System',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  requiredStar: {
    color: "#F44336",
  },
  input: {
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    fontSize: 16,
    fontFamily: 'System',
    color: "#333",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e9f7f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f9c8b",
  },
  secondaryButtonText: {
    color: "#1f9c8b",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System',
  },
  modalButtons: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f9c8b",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6c757d",
    padding: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f9c8b",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // MAP UPLOAD STYLES
  mapUploadContainer: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  changeImageBtn: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'System',
  },
  mapUploadButtons: {
    flexDirection: "row",
    marginTop: 10
  },
  
  // MAPS LIST
  mapsList: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  mapsListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
    fontFamily: 'System',
  },
  mapItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  mapItemInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapItemName: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    fontFamily: 'System',
  },
  removeMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  removeMapText: {
    color: "#F44336",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // SELECT MODAL
  selectCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxHeight: "85%",
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  selectHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalSub: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
    fontFamily: 'System',
  },
  selectList: {
    width: "100%",
    maxHeight: 400,
  },
  selectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e9f7f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectItemContent: {
    flex: 1,
  },
  selectItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  selectItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  selectItemId: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'System',
  },
  selectItemDot: {
    fontSize: 12,
    color: "#ccc",
    marginHorizontal: 6,
  },
  selectItemSub: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'System',
  },
  cancelWide: {
    marginTop: 20,
    backgroundColor: "#6c757d",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelWideText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // CONFIRMATION MODAL
  confirmCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f9c8b",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: 'System',
  },
  confirmText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: 'System',
    lineHeight: 22,
  },
  confirmWarning: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    fontFamily: 'System',
    fontStyle: "italic",
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6c757d",
    padding: 16,
    borderRadius: 8,
  },
  confirmCancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f9c8b",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  confirmDeleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  deletedCustomersSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  deletedListContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  deletedCustomerCard: {
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deletedCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deletedCustomerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deletedCustomerInfo: {
    flex: 1,
  },
  deletedCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
    textDecorationLine: 'line-through',
  },
  deletedCustomerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  deletedCustomerId: {
    fontSize: 12,
    color: '#adb5bd',
    marginRight: 10,
  },
  deletedDate: {
    fontSize: 12,
    color: '#1f9c8b',
    fontWeight: '500',
  },
  deletedCustomerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 156, 139, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  restoreButtonText: {
    color: '#1f9c8b',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  permanentDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  permanentDeleteButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyDeletedState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  emptyDeletedText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#95a5a6',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});