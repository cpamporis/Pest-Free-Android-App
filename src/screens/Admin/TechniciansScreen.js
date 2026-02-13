// TechniciansScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import apiService from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";

// Technician Modal Component
const TechnicianModal = ({ isEdit, visible, onClose, onSubmit, technician, loading }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    username: "",
    email: "",
    password: "",
  });

  // Update form when technician changes
  useEffect(() => {
    if (technician && isEdit) {
      setFormData({
        firstName: technician.firstName || "",
        lastName: technician.lastName || "",
        age: technician.age?.toString() || "",
        username: technician.username || "",
        email: technician.email || "",
        password: "",
      });
    } else {
      // Reset form for add mode
      setFormData({
        firstName: "",
        lastName: "",
        age: "",
        username: "",
        email: "",
        password: "",
      });
    }
  }, [technician, isEdit]);

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.username || (!isEdit && !formData.password)) {
      Alert.alert("Error", "Please fill all required fields (*)");
      return;
    }

    onSubmit(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal 
      animationType="slide" 
      transparent 
      visible={visible}
      onRequestClose={onClose}
    >
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
                  <MaterialIcons 
                    name={isEdit ? "edit" : "person-add"} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {isEdit ? "Edit Technician" : "Add New Technician"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEdit ? "Update technician details" : "Fill in the details below"}
                </Text>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.inputRow}>
                  <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>
                      First Name <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter first name"
                      placeholderTextColor="#999"
                      value={formData.firstName}
                      onChangeText={(text) => updateField('firstName', text)}
                      editable={!loading}
                    />
                  </View>

                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      Last Name <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter last name"
                      placeholderTextColor="#999"
                      value={formData.lastName}
                      onChangeText={(text) => updateField('lastName', text)}
                      editable={!loading}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter age (optional)"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={formData.age}
                    onChangeText={(text) => updateField('age', text)}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Username <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    value={formData.username}
                    onChangeText={(text) => updateField('username', text)}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="username@pest-free.gr"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={formData.email}
                    onChangeText={(text) => updateField('email', text)}
                    editable={!loading}
                  />
                  <Text style={styles.inputHint}>
                    Leave blank to auto-generate: username@pest-free.gr
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {isEdit ? "New Password (optional)" : "Password *"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={isEdit ? "Enter new password" : "Enter password"}
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={formData.password}
                    onChangeText={(text) => updateField('password', text)}
                    editable={!loading}
                  />
                  {isEdit && (
                    <Text style={styles.inputHint}>
                      Leave blank to keep current password
                    </Text>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, loading && { opacity: 0.7 }]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, loading && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name={isEdit ? "check-circle" : "save"} size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>
                        {isEdit ? "Update Technician" : "Save Technician"}
                      </Text>
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
};

export default function TechniciansScreen({ onClose }) {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [technicianToDelete, setTechnicianToDelete] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const activeTechs = technicians.filter(t => t.isActive !== false);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    setLoading(true);
    try {
      console.log("=== LOADING TECHNICIANS ===");

      const result = await apiService.getTechnicians();

      console.log("Technicians API Result:", result);

      if (Array.isArray(result)) {
        console.log(`✅ Found ${result.length} technicians`);
        setTechnicians(result);
      } else {
        console.log("❌ Invalid response format");
        setTechnicians([]);
      }

    } catch (error) {
      console.error("Failed to load technicians:", error);
      Alert.alert("Error", "Failed to load technicians. Check backend connection.");
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnician = async (formData) => {
    setSaveLoading(true);
    try {
      const newTech = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        // Auto-generate email if not provided
        email: formData.email || `${formData.username}@pest-free.gr`
      };

      const result = await apiService.createTechnician(newTech);
      
      if (result && result.success) {
        Alert.alert("Success", "Technician added successfully");
        setShowAddModal(false);
        loadTechnicians();
      } else {
        Alert.alert("Error", result?.error || "Failed to add technician");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to add technician");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEditTechnician = async (formData) => {
    setSaveLoading(true);
    try {
      const updatedTech = {
        ...selectedTechnician,
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age ? parseInt(formData.age) : null,
        username: formData.username,
        email: formData.email || `${formData.username}@pest-free.gr`,
        // Only update password if provided
        ...(formData.password ? { password: formData.password } : {})
      };

      const result = await apiService.updateTechnician(selectedTechnician.technicianId, updatedTech);
      
      if (result && result.success) {
        Alert.alert("Success", "Technician updated successfully");
        setShowEditModal(false);
        setSelectedTechnician(null);
        loadTechnicians();
      } else {
        Alert.alert("Error", result?.error || "Failed to update technician");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update technician");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTechnician = (techId) => {
    const tech = technicians.find(t => t.technicianId === techId);
    if (!tech) return;
    
    setTechnicianToDelete(techId);
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!technicianToDelete) return;

    try {
      const result = await apiService.deleteTechnician(technicianToDelete);
      
      if (result && result.success) {
        Alert.alert("Success", "Technician deleted successfully");
        loadTechnicians();
      } else {
        Alert.alert("Error", result?.error || "Failed to delete technician");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to delete technician");
    } finally {
      setDeleteConfirm(false);
      setTechnicianToDelete(null);
    }
  };

  const openEditModal = (tech) => {
    setSelectedTechnician(tech);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>Loading Technicians...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.adminBadge}>
                <MaterialIcons name="engineering" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>TECHNICIANS</Text>
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
            <Text style={styles.welcomeText}>Technician Management</Text>
            <Text style={styles.title}>Manage Technician Profiles</Text>
            <Text style={styles.subtitle}>
              Add, edit, or remove technicians from the system
            </Text>
          </View>
        </View>

        {/* STATS BAR */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="engineering" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{activeTechs.length}</Text>
            <Text style={styles.statLabel}>Total Technicians</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="check-circle" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{activeTechs.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="new-releases" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>
              {technicians.filter(t => {
                if (!t.createdAt) return false;
                try {
                  const createdDate = new Date(t.createdAt);
                  const now = new Date();
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  return createdDate >= startOfMonth;
                } catch (e) {
                  return false;
                }
              }).length}
            </Text>
            <Text style={styles.statLabel}>New This Month</Text>
          </View>
        </View>

        {/* ACTION HEADER */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="list-alt" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Technician List</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="person-add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add Technician</Text>
          </TouchableOpacity>
        </View>

        {/* TECHNICIANS LIST */}
        {technicians.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="engineering" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>No Technicians Found</Text>
            <Text style={styles.emptyStateText}>
              Start by adding your first technician to the system
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="person-add" size={18} color="#fff" />
              <Text style={styles.emptyStateButtonText}>Add First Technician</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            key={technicians.length}
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            
            {activeTechs.map((tech) => (
              <View
                key={tech.technicianId}
                style={styles.techCard}
              >
                <View style={styles.techHeader}>
                  <View style={styles.techAvatar}>
                    <MaterialIcons name="engineering" size={24} color="#fff" />
                  </View>

                  <View style={styles.techInfo}>
                    <Text style={styles.techName}>
                      {tech.firstName} {tech.lastName}
                    </Text>

                    <View style={styles.techMeta}>
                      <View style={styles.techMetaItem}>
                        <MaterialIcons name="person" size={12} color="#666" />
                        <Text style={styles.techMetaText}>{tech.username}</Text>
                      </View>

                      <View style={styles.techMetaItem}>
                        <MaterialIcons name="mail" size={12} color="#666" />
                        <Text style={styles.techMetaText}>{tech.email}</Text>
                      </View>

                      {tech.age !== null && (
                        <View style={styles.techMetaItem}>
                          <MaterialIcons name="cake" size={12} color="#666" />
                          <Text style={styles.techMetaText}>{tech.age} years</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.techIdBadge}>
                    <Text style={styles.techIdText}>
                      ID: {tech.technicianId.length > 10 
                        ? `${tech.technicianId.substring(0, 8)}...` 
                        : tech.technicianId}
                    </Text>
                  </View>
                </View>

                <View style={styles.techActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(tech)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="edit" size={16} color="#1f9c8b" />
                    <Text style={[styles.actionButtonText, { color: "#1f9c8b" }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteTechnician(tech.technicianId)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete" size={16} color="#F44336" />
                    <Text style={[styles.actionButtonText, { color: "#F44336" }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Technician Management System</Text>
          <Text style={styles.footerSubtext}>
            Version 1.0 • Last updated: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Pest-Free. All rights reserved.
          </Text>
        </View>

        {/* Modals */}
        <TechnicianModal
          isEdit={false}
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTechnician}
          loading={saveLoading}
        />

        <TechnicianModal
          isEdit={true}
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTechnician(null);
          }}
          onSubmit={handleEditTechnician}
          technician={selectedTechnician}
          loading={saveLoading}
        />

        {/* Delete Confirmation Modal */}
        <Modal animationType="fade" transparent visible={deleteConfirm}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconContainer}>
                <MaterialIcons name="warning" size={40} color="#F44336" />
              </View>
              <Text style={styles.confirmTitle}>Delete Technician</Text>
              <Text style={styles.confirmText}>
                Are you sure you want to delete this technician? This action cannot be undone.
              </Text>
              <Text style={styles.confirmWarning}>
                All assigned visits and history will be permanently removed.
              </Text>
              
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => {
                    setDeleteConfirm(false);
                    setTechnicianToDelete(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={confirmDelete}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete" size={18} color="#fff" />
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f9c8b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  
  // TECHNICIAN CARDS
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  techCard: {
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
  techHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  techAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  techMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  techMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  techMetaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontFamily: 'System',
  },
  techIdBadge: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  techIdText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
    fontFamily: 'System',
  },
  techActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#f8f9fa",
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba((33, 150, 243, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  
  // EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    marginHorizontal: 20,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
    maxHeight: "80%",
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
  inputRow: {
    flexDirection: "row",
    marginBottom: 16,
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
  inputHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontFamily: 'System',
    fontStyle: "italic",
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
  
  // CONFIRMATION MODAL
  confirmOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0008",
    padding: 20,
  },
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
    color: "#F44336",
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
    backgroundColor: "#F44336",
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
});