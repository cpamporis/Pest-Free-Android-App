// MaterialsScreen.js - Updated version
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import apiService from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import i18n from "../../services/i18n";

export default function MaterialsScreen({ onClose }) {
  const [activeSection, setActiveSection] = useState("bait"); // "bait" or "chemicals"
  const [baitTypes, setBaitTypes] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [newValue, setNewValue] = useState("");
  const [newActiveIngredient, setNewActiveIngredient] = useState("");
  const [newAntidote, setNewAntidote] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [editingActiveIngredient, setEditingActiveIngredient] = useState("");
  const [editingAntidote, setEditingAntidote] = useState("");
  const [selectedValue, setSelectedValue] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Configuration for each section
  const sections = {
    bait: {
      title: i18n.t("admin.materials.categories.bait"),
      emptyText: i18n.t("admin.materials.content.emptyTitle", { plural: i18n.t("admin.materials.categories.bait").toLowerCase() }),
      loadItems: apiService.getBaitTypes,
      saveItems: apiService.postBaitTypes,
      singular: i18n.t("admin.materials.categories.baitSingular") || "bait type",
      plural: i18n.t("admin.materials.categories.bait").toLowerCase(),
      icon: "pest-control-rodent",
      color: "#1f9c8b",
      items: baitTypes,
      setItems: setBaitTypes,
    },
    chemicals: {
      title: i18n.t("admin.materials.categories.chemicals"),
      emptyText: i18n.t("admin.materials.content.emptyTitle", { plural: i18n.t("admin.materials.categories.chemicals").toLowerCase() }),
      loadItems: apiService.getChemicals,
      saveItems: apiService.postChemicals,
      singular: i18n.t("admin.materials.categories.chemicalsSingular") || "chemical",
      plural: i18n.t("admin.materials.categories.chemicals").toLowerCase(),
      icon: "science",
      color: "#1f9c8b",
      items: chemicals,
      setItems: setChemicals,
    },
  };

  const currentSection = sections[activeSection];
  const items = currentSection.items;

  // Load all data on initial mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const formatItems = (items) => {
        if (!Array.isArray(items)) return [];
        
        return items.map(item => {
          if (typeof item === 'string') {
            return { name: item, active_ingredient: null, antidote: null };
          }
          return {
            name: item.name || item,
            active_ingredient: item.active_ingredient || null,
            antidote: item.antidote || null
          };
        });
      };
      
      const baitResult = await apiService.getBaitTypes();
      
      let baitArray = [];
      if (Array.isArray(baitResult)) {
        baitArray = baitResult;
      } else if (baitResult?.success && Array.isArray(baitResult.baitTypes)) {
        baitArray = baitResult.baitTypes;
      }

      setBaitTypes(formatItems(baitArray));

      const chemResult = await apiService.getChemicals();
      
      let chemArray = [];
      if (Array.isArray(chemResult)) {
        chemArray = chemResult;
      } else if (chemResult?.success && Array.isArray(chemResult.chemicals)) {
        chemArray = chemResult.chemicals;
      }
 
      setChemicals(formatItems(chemArray));
      
    } catch (e) {
      console.error("Failed to load materials:", e);
      setBaitTypes([]);
      setChemicals([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentSection = async () => {
    setLoading(true);
    try {
      const result = await currentSection.loadItems();
      
      const formatItems = (items) => {
        if (!Array.isArray(items)) return [];
        
        return items.map(item => {
          if (typeof item === 'string') {
            return { name: item, active_ingredient: null, antidote: null };
          }
          return {
            name: item.name || item,
            active_ingredient: item.active_ingredient || null,
            antidote: item.antidote || null
          };
        });
      };
      
      let formattedItems = [];
      
      if (Array.isArray(result)) {
        formattedItems = formatItems(result);
      } else if (result?.success) {
        if (activeSection === "chemicals" && Array.isArray(result.chemicals)) {
          formattedItems = formatItems(result.chemicals);
        } else if (activeSection === "bait" && Array.isArray(result.baitTypes)) {
          formattedItems = formatItems(result.baitTypes);
        } else if (Array.isArray(result.data)) {
          formattedItems = formatItems(result.data);
        } else if (Array.isArray(result.items)) {
          formattedItems = formatItems(result.items);
        }
      }
      
      if (activeSection === "chemicals") {
        setChemicals(formattedItems);
      } else {
        setBaitTypes(formattedItems);
      }
      
    } catch (e) {
      console.error(`Failed to load ${currentSection.plural}:`, e);
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("admin.materials.refreshFailed", { 
          singular: currentSection.singular,
          plural: currentSection.plural 
        }) || `Could not refresh ${currentSection.plural}. Please try again.`
      );
    } finally {
      setLoading(false);
      setSelectedValue(null);
      setEditingValue("");
      setEditingActiveIngredient("");
      setEditingAntidote("");
      setShowDropdown(false);
    }
  };

  const persist = async (updated) => {
    setSaving(true);
    try {
      
      let result;
      
      if (activeSection === "chemicals") {
        result = await apiService.postChemicals(updated);
      } else {
        result = await apiService.postBaitTypes(updated);
      }
      
      if (result?.success) {
        if (activeSection === "chemicals") {
          setChemicals(updated);
        } else {
          setBaitTypes(updated);
        }
        Alert.alert(
          i18n.t("common.success"), 
          i18n.t("admin.materials.saveSuccess", { 
            singular: currentSection.singular,
            plural: currentSection.plural 
          }) || `${currentSection.singular} updated successfully`
        );
      } else {
        Alert.alert(
          i18n.t("common.error"),
          result?.error || i18n.t("admin.materials.saveFailed", { 
            singular: currentSection.singular,
            plural: currentSection.plural 
          }) || `Failed to save ${currentSection.singular}`
        );
      }
    } catch (e) {
      console.error("Save error:", e);
      Alert.alert(
        i18n.t("common.error"), 
        `${i18n.t("admin.materials.saveFailed", { 
          singular: currentSection.singular,
          plural: currentSection.plural 
        })}: ${e.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    const trimmedName = newValue.trim();
    const trimmedActiveIngredient = newActiveIngredient.trim();
    const trimmedAntidote = newAntidote.trim();
    
    if (!trimmedName) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("admin.materials.content.nameRequired", { 
          singular: currentSection.singular 
        }) || `Please enter a ${currentSection.singular} name`
      );
      return;
    }

    if (items.some(item => item.name === trimmedName)) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("admin.materials.duplicateError", { 
          singular: currentSection.singular 
        }) || `This ${currentSection.singular} name already exists`
      );
      return;
    }

    const newItem = {
      name: trimmedName,
      active_ingredient: trimmedActiveIngredient || null,
      antidote: trimmedAntidote || null
    };

    const updated = [...items, newItem];
    
    setNewValue("");
    setNewActiveIngredient("");
    setNewAntidote("");
    
    await persist(updated);
  };

  const confirmDelete = async () => {
    if (!selectedValue) return;

    const updated = items.filter(item => item.name !== selectedValue.name);
    await persist(updated);
    setSelectedValue(null);
    setEditingValue("");
    setEditingActiveIngredient("");
    setEditingAntidote("");
    setShowDropdown(false);
    setShowDeleteModal(false);
  };

  const deleteSelected = () => {
    if (!selectedValue) return;
    setShowDeleteModal(true);
  };

  const confirmEdit = async () => {
    const trimmedName = editingValue.trim();
    const trimmedActiveIngredient = editingActiveIngredient.trim();
    const trimmedAntidote = editingAntidote.trim();
    
    if (!trimmedName) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("admin.materials.content.nameRequired", { 
          singular: currentSection.singular 
        }) || `${currentSection.singular} name cannot be empty`
      );
      return;
    }
    if (!selectedValue) return;

    if (items.some(item => item.name === trimmedName && item.name !== selectedValue.name)) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("admin.materials.duplicateError", { 
          singular: currentSection.singular 
        }) || `This ${currentSection.singular} name already exists`
      );
      return;
    }

    const updated = items.map(item => 
      item.name === selectedValue.name 
        ? {
            ...item,
            name: trimmedName,
            active_ingredient: trimmedActiveIngredient || null,
            antidote: trimmedAntidote || null
          }
        : item
    );
    
    await persist(updated);
    setSelectedValue(updated.find(item => item.name === trimmedName));
  };

  const handleSectionChange = (section) => {
    if (section !== activeSection) {
      setActiveSection(section);
      setSelectedValue(null);
      setEditingValue("");
      setEditingActiveIngredient("");
      setEditingAntidote("");
      setShowDropdown(false);
      setShowDetails(false);
      setNewValue("");
      setNewActiveIngredient("");
      setNewAntidote("");
    }
  };

  const handleSelectItem = (item) => {
    const selectedItem = typeof item === 'string' 
      ? { name: item, active_ingredient: null, antidote: null }
      : item;
      
    setSelectedValue(selectedItem);
    setEditingValue(selectedItem.name);
    setEditingActiveIngredient(selectedItem.active_ingredient || "");
    setEditingAntidote(selectedItem.antidote || "");
    setShowDropdown(false);
    setShowDetails(true);
  };

  const totalBaitTypes = baitTypes.length;
  const totalChemicals = chemicals.length;
  const totalItems = totalBaitTypes + totalChemicals;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>{i18n.t("admin.materials.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.brandContainer}>
                <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
                <View style={styles.adminBadge}>
                  <MaterialIcons name="inventory" size={14} color="#fff" />
                  <Text style={styles.adminBadgeText}>{i18n.t("admin.materials.header.badge")}</Text>
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
              <Text style={styles.welcomeText}>{i18n.t("admin.materials.header.welcome")}</Text>
              <Text style={styles.title}>{i18n.t("admin.materials.header.title")}</Text>
              <Text style={styles.subtitle}>
                {i18n.t("admin.materials.header.subtitle")}
              </Text>
            </View>
          </View>

          {/* STATS BAR */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="pest-control-rodent" size={18} color="#1f9c8b" />
              </View>
              <Text style={styles.statNumber}>{totalBaitTypes}</Text>
              <Text style={styles.statLabel}>{i18n.t("admin.materials.stats.baitTypes")}</Text>
              <Text style={styles.statTrend}>
                {activeSection === "bait" ? i18n.t("admin.materials.stats.active") : i18n.t("admin.materials.stats.stored")}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="science" size={18} color="#1f9c8b" />
              </View>
              <Text style={styles.statNumber}>{totalChemicals}</Text>
              <Text style={styles.statLabel}>{i18n.t("admin.materials.stats.chemicals")}</Text>
              <Text style={styles.statTrend}>
                {activeSection === "chemicals" ? i18n.t("admin.materials.stats.active") : i18n.t("admin.materials.stats.stored")}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="inventory" size={18} color="#1f9c8b" />
              </View>
              <Text style={styles.statNumber}>{totalItems}</Text>
              <Text style={styles.statLabel}>{i18n.t("admin.materials.stats.totalItems")}</Text>
              <Text style={styles.statTrend}>{i18n.t("admin.materials.stats.combined")}</Text>
            </View>
          </View>

          {/* SECTION SELECTION */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="category" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>{i18n.t("admin.materials.categories.title")}</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshCurrentSection}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#1f9c8b" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={18} color="#1f9c8b" />
                  <Text style={styles.refreshButtonText}>{i18n.t("common.refresh")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[
                styles.sectionTab,
                activeSection === "bait" && styles.activeSectionTab,
                { borderColor: activeSection === "bait" ? "#1f9c8b" : "#e9ecef" }
              ]}
              onPress={() => handleSectionChange("bait")}
              activeOpacity={0.7}
            >
              <View style={[
                styles.sectionTabIcon,
                { backgroundColor: activeSection === "bait" ? "#1f9c8b" : "#f8f9fa" }
              ]}>
                <MaterialIcons 
                  name="pest-control-rodent" 
                  size={20} 
                  color={activeSection === "bait" ? "#fff" : "#666"} 
                />
              </View>
              <Text style={[
                styles.sectionTabText,
                activeSection === "bait" && styles.activeSectionTabText
              ]}>
                {i18n.t("admin.materials.categories.bait")}
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{totalBaitTypes}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sectionTab,
                activeSection === "chemicals" && styles.activeSectionTab,
                { borderColor: activeSection === "chemicals" ? "#1f9c8b" : "#e9ecef" }
              ]}
              onPress={() => handleSectionChange("chemicals")}
              activeOpacity={0.7}
            >
              <View style={[
                styles.sectionTabIcon,
                { backgroundColor: activeSection === "chemicals" ? "#1f9c8b" : "#f8f9fa" }
              ]}>
                <MaterialIcons 
                  name="science" 
                  size={20} 
                  color={activeSection === "chemicals" ? "#fff" : "#666"} 
                />
              </View>
              <Text style={[
                styles.sectionTabText,
                activeSection === "chemicals" && styles.activeSectionTabText
              ]}>
                {i18n.t("admin.materials.categories.chemicals")}
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{totalChemicals}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* CONTENT AREA */}
          <View style={styles.contentCard}>
            <View style={styles.contentHeader}>
              <View style={styles.contentTitleContainer}>
                <MaterialIcons name={currentSection.icon} size={24} color={currentSection.color} />
                <Text style={styles.contentTitle}>{currentSection.title}</Text>
              </View>
              <Text style={styles.itemCount}>
                {items.length === 1
                  ? i18n.t("admin.materials.content.itemCount_one", { count: items.length, singular: currentSection.singular })
                  : i18n.t("admin.materials.content.itemCount_other", { count: items.length, plural: currentSection.plural })}
              </Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name={currentSection.icon} size={50} color="#ddd" />
                </View>
                <Text style={styles.emptyStateTitle}>
                  {i18n.t("admin.materials.content.emptyTitle", { plural: currentSection.plural })}
                </Text>
                <Text style={styles.emptyStateText}>
                  {i18n.t("admin.materials.content.emptyText", { singular: currentSection.singular })}
                </Text>
              </View>
            ) : (
              <>
                {/* SELECT EXISTING ITEM */}
                <Text style={styles.inputLabel}>
                  {i18n.t("admin.materials.content.selectToEdit", { singular: currentSection.singular })}
                </Text>
                
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowDropdown(!showDropdown)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownContent}>
                    <MaterialIcons 
                      name={currentSection.icon} 
                      size={20} 
                      color={currentSection.color} 
                    />
                    <Text style={[
                      styles.dropdownText,
                      !selectedValue && { color: "#999" }
                    ]}>
                      {selectedValue 
                        ? (typeof selectedValue === 'string' ? selectedValue : selectedValue.name) 
                        : i18n.t("admin.materials.content.selectPlaceholder", { singular: currentSection.singular })}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name={showDropdown ? "expand-less" : "expand-more"} 
                    size={24} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {showDropdown && items.length > 0 && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {items.map((item, index) => {
                        const itemName = typeof item === 'string' ? item : item.name;
                        return (
                          <TouchableOpacity
                            key={`${itemName}-${index}`}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectItem(item)}
                          >
                            <MaterialIcons name="check-circle" size={16} color={currentSection.color} />
                            <Text style={styles.dropdownItemText}>
                              {itemName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* EDIT SELECTED ITEM */}
                {selectedValue && (
                  <View style={styles.editSection}>
                    <View style={styles.editHeader}>
                      <Text style={styles.editTitle}>
                        {i18n.t("admin.materials.content.editTitle", { singular: currentSection.singular })}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowDetails(!showDetails)}
                        style={styles.toggleDetailsButton}
                      >
                        <MaterialIcons 
                          name={showDetails ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                          size={24} 
                          color="#1f9c8b" 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.inputLabel}>
                      {i18n.t("admin.materials.content.nameLabel", { type: currentSection.singular.charAt(0).toUpperCase() + currentSection.singular.slice(1) })}
                    </Text>
                    
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={editingValue}
                        onChangeText={setEditingValue}
                        editable={!saving}
                        placeholder={i18n.t("admin.materials.content.namePlaceholder", { singular: currentSection.singular }) || `Enter ${currentSection.singular} name`}
                        placeholderTextColor="#999"
                      />
                    </View>

                    {showDetails && (
                      <>
                        <Text style={styles.inputLabel}>
                          {i18n.t("admin.materials.content.activeIngredient")}
                        </Text>
                        
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            value={editingActiveIngredient}
                            onChangeText={setEditingActiveIngredient}
                            editable={!saving}
                            placeholder={i18n.t("admin.materials.content.activeIngredientPlaceholder")}
                            placeholderTextColor="#999"
                          />
                        </View>

                        <Text style={styles.inputLabel}>
                          {i18n.t("admin.materials.content.antidote")}
                        </Text>
                        
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            value={editingAntidote}
                            onChangeText={setEditingAntidote}
                            editable={!saving}
                            placeholder={i18n.t("admin.materials.content.antidotePlaceholder")}
                            placeholderTextColor="#999"
                          />
                        </View>

                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={[
                              styles.saveButton,
                              { backgroundColor: editingValue === selectedValue.name && 
                                editingActiveIngredient === (selectedValue.active_ingredient || "") && 
                                editingAntidote === (selectedValue.antidote || "") ? 
                                "#6c757d" : "#1f9c8b" }
                            ]}
                            onPress={confirmEdit}
                            disabled={saving || (
                              editingValue === selectedValue.name && 
                              editingActiveIngredient === (selectedValue.active_ingredient || "") && 
                              editingAntidote === (selectedValue.antidote || "")
                            )}
                            activeOpacity={0.7}
                          >
                            {saving ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <MaterialIcons name="save" size={18} color="#fff" />
                                <Text style={styles.saveButtonText}>{i18n.t("admin.materials.content.saveChanges")}</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={deleteSelected}
                            disabled={saving}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="delete" size={18} color="#fff" />
                            <Text style={styles.deleteButtonText}>
                              {i18n.t("admin.materials.content.deleteItem", { singular: currentSection.singular })}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* ITEMS LIST */}
                <View style={styles.itemsListSection}>
                  <View style={styles.itemsListHeader}>
                    <Text style={styles.itemsListTitle}>
                      {items.length === 1
                        ? i18n.t("admin.materials.content.allItems_one", { count: items.length, plural: currentSection.plural })
                        : i18n.t("admin.materials.content.allItems_other", { count: items.length, plural: currentSection.plural })}
                    </Text>
                  </View>
                  
                  <View style={styles.itemsList}>
                    {items.map((item) => (
                      <View key={item.name} style={styles.itemCard}>
                        <View style={styles.itemMainInfo}>
                          <View style={styles.itemInfo}>
                            <MaterialIcons name={currentSection.icon} size={16} color={currentSection.color} />
                            <Text style={styles.itemText}>
                              {typeof item === 'string' ? item : item.name}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.itemAction}
                            onPress={() => handleSelectItem(item)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="edit" size={16} color="#1f9c8b" />
                            <Text style={styles.itemActionText}>{i18n.t("common.edit")}</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.itemDetailsPreview}>
                          {item.active_ingredient && (
                            <View style={styles.detailTag}>
                              <MaterialIcons name="science" size={12} color="#1f9c8b" />
                              <Text style={styles.detailTagText} numberOfLines={1}>
                                {item.active_ingredient}
                              </Text>
                            </View>
                          )}
                          
                          {item.antidote && (
                            <View style={[styles.detailTag, { backgroundColor: "#E3F2FD" }]}>
                              <MaterialIcons name="medical-services" size={12} color="#1f9c8b" />
                              <Text style={[styles.detailTagText, { color: '#333' }]} numberOfLines={1}>
                                {i18n.t("admin.materials.content.antidoteLabel")}: {item.antidote.length > 20 ? item.antidote.substring(0, 20) + '...' : item.antidote}
                              </Text>
                            </View>
                          )}
                          
                          {!item.active_ingredient && !item.antidote && (
                            <Text style={styles.noDetailsText}>{i18n.t("admin.materials.content.noDetails")}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* ADD NEW ITEM SECTION */}
            <View style={styles.addSection}>
              <View style={styles.sectionDivider} />
              
              <View style={styles.addHeader}>
                <Text style={styles.addTitle}>
                  {i18n.t("admin.materials.content.addTitle", { singular: currentSection.singular })}
                </Text>
                <View style={styles.addIndicator}>
                  <MaterialIcons name="add-circle" size={20} color="#1f9c8b" />
                </View>
              </View>
              
              <Text style={styles.inputLabel}>
                {i18n.t("admin.materials.content.nameLabel", { type: currentSection.singular.charAt(0).toUpperCase() + currentSection.singular.slice(1) })} *
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("admin.materials.content.addNamePlaceholder", { singular: currentSection.singular })}
                  placeholderTextColor="#999"
                  value={newValue}
                  onChangeText={setNewValue}
                  editable={!saving}
                />
              </View>

              <Text style={styles.inputLabel}>
                {i18n.t("admin.materials.content.activeIngredient")}
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("admin.materials.content.activeIngredientPlaceholder")}
                  placeholderTextColor="#999"
                  value={newActiveIngredient}
                  onChangeText={setNewActiveIngredient}
                  editable={!saving}
                />
              </View>

              <Text style={styles.inputLabel}>
                {i18n.t("admin.materials.content.antidote")}
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("admin.materials.content.antidotePlaceholder")}
                  placeholderTextColor="#999"
                  value={newAntidote}
                  onChangeText={setNewAntidote}
                  editable={!saving}
                />
              </View>
              
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: !newValue.trim() ? "#ccc" : "#1f9c8b" }
                ]}
                onPress={addItem}
                disabled={saving || !newValue.trim()}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>{i18n.t("admin.materials.content.addButton", { singular: currentSection.singular })}</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.inputHint}>
                {i18n.t("admin.materials.content.hint")}
              </Text>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {i18n.t("admin.materials.footer.system")}
            </Text>
            <Text style={styles.footerSubtext}>
              {i18n.t("admin.materials.footer.version", { date: new Date().toLocaleDateString() })}
            </Text>
            <Text style={styles.footerCopyright}>
              {i18n.t("admin.materials.footer.copyright", { year: new Date().getFullYear() })}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="warning" size={40} color="#F44336" />
            </View>
            <Text style={styles.modalTitle}>{i18n.t("admin.materials.deleteModal.title", { singular: currentSection.singular })}</Text>
            <Text style={styles.modalText}>
              {i18n.t("admin.materials.deleteModal.message", { name: selectedValue?.name })}
            </Text>
            {selectedValue?.active_ingredient && (
              <View style={styles.modalInfo}>
                <MaterialIcons name="info" size={16} color="#2196F3" />
                <Text style={styles.modalInfoText}>
                  {i18n.t("admin.materials.deleteModal.activeIngredient", { ingredient: selectedValue.active_ingredient })}
                </Text>
              </View>
            )}
            <Text style={styles.modalWarning}>
              {i18n.t("admin.materials.deleteModal.warning", { singular: currentSection.singular })}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>{i18n.t("common.cancel")}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete" size={18} color="#fff" />
                <Text style={styles.modalDeleteButtonText}>{i18n.t("common.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  
  // HEADER (keep existing styles)
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
  
  // STATS BAR (keep existing styles)
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
    marginBottom: 2,
  },
  statTrend: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  statDivider: {
    width: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 10,
  },
  
  // SECTION HEADER (keep existing styles)
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
  
  // SECTION TABS (keep existing styles)
  sectionTabs: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeSectionTab: {
    backgroundColor: "#fff",
  },
  sectionTabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    fontFamily: 'System',
    flex: 1,
  },
  activeSectionTabText: {
    color: "#2c3e50",
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  
  // CONTENT CARD (keep existing styles)
  contentCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
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
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  contentTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginLeft: 12,
    fontFamily: 'System',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f9c8b",
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontFamily: 'System',
  },
  
  // EMPTY STATE (keep existing styles)
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    fontFamily: 'System',
    lineHeight: 22,
  },
  
  // INPUTS & DROPDOWN (keep existing styles, add new ones)
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    marginTop: 16,
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    fontSize: 16,
    fontFamily: 'System',
    color: "#333",
  },
  inputActionButton: {
    width: 50,
    marginLeft: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  inputHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
    fontFamily: 'System',
    textAlign: "center",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginBottom: 8,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
    fontFamily: 'System',
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginBottom: 16,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
    fontFamily: 'System',
  },
  
  // EDIT SECTION (updated)
  editSection: {
    marginBottom: 24,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  toggleDetailsButton: {
    padding: 4,
  },
  editActions: {
    marginTop: 20,
    gap: 10,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // ADD SECTION (updated)
  addSection: {
    marginBottom: 24,
    backgroundColor: "#f0f7f6",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d1e7e3",
  },
  addHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  addIndicator: {
    padding: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 24,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // ITEMS LIST (enhanced)
  itemsListSection: {
    marginTop: 8,
  },
  itemsListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  itemsListStats: {
    flexDirection: "row",
    gap: 8,
  },
  itemsList: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  itemCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  itemMainInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
    fontFamily: 'System',
  },
  itemAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  itemActionText: {
    fontSize: 12,
    color: "#1f9c8b",
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: 'System',
  },
  itemDetailsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  detailTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    maxWidth: "48%",
  },
  detailTagText: {
    fontSize: 11,
    color: "#333",
    fontFamily: 'System',
  },
  noDetailsText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    fontFamily: 'System',
  },
  
  // FOOTER (updated)
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
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
  
  // LOADING (keep existing)
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
  
  // MODAL (updated)
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0008",
    padding: 20,
  },
  modalCard: {
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
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F44336",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: 'System',
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: 'System',
    lineHeight: 22,
  },
  modalInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  modalInfoText: {
    fontSize: 14,
    color: "#1976D2",
    fontFamily: 'System',
  },
  modalWarning: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    fontFamily: 'System',
    fontStyle: "italic",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6c757d",
    padding: 16,
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  modalDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  modalDeleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  dropdownScrollView: {
    maxHeight: 200, 
  },
});