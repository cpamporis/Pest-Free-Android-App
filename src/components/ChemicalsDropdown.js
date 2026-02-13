// ChemicalsDropdown.js - WORKING VERSION with Green Blocks Styling
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  Alert
} from 'react-native';
import apiService from '../services/apiService';

export default function ChemicalsDropdown({ 
  selectedChemicals = [], 
  onChemicalsChange, 
  disabled = false,
  editable = true 
}) {
  const [chemicals, setChemicals] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [concentration, setConcentration] = useState('');
  const [volume, setVolume] = useState('');

  // Debug props
  useEffect(() => {
    console.log("🧪 DEBUG ChemicalsDropdown Props:", {
      selectedChemicals,
      selectedChemicalsLength: selectedChemicals?.length,
      disabled,
      editable
    });
    
    if (selectedChemicals?.length > 0) {
      selectedChemicals.forEach((chem, idx) => {
        console.log(`🧪 Chemical ${idx}:`, chem);
        console.log(`🧪 Type:`, typeof chem);
        console.log(`🧪 Keys:`, chem ? Object.keys(chem) : 'null');
      });
    }
  }, [selectedChemicals]);

  useEffect(() => {
    loadChemicals();
  }, []);

  const loadChemicals = async () => {
    try {
      console.log("🔍 Loading chemicals for dropdown...");
      
      // Use apiService.getChemicals() directly
      const result = await apiService.getChemicals();
      console.log("📥 Raw result from getChemicals():", result);
      
      // Handle different response formats
      let chemicalArray = [];
      
      if (Array.isArray(result)) {
        // Direct array of strings or objects
        chemicalArray = result;
      } else if (result && result.chemicals && Array.isArray(result.chemicals)) {
        // {success: true, chemicals: [...]}
        chemicalArray = result.chemicals;
      } else if (result && result.success && Array.isArray(result.data)) {
        // {success: true, data: [...]}
        chemicalArray = result.data;
      } else if (result?.success && Array.isArray(result.chemicals)) {
        // Alternative format
        chemicalArray = result.chemicals;
      }
      
      console.log("✅ Processed chemical array:", chemicalArray);
      console.log("✅ Chemical count:", chemicalArray.length);
      
      // Extract just the names for the dropdown
      const chemicalNames = chemicalArray.map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item && typeof item === 'object') {
          return item.name || item.chemicalName || '';
        }
        return '';
      }).filter(name => name && name.trim());
      
      console.log("✅ Chemical names for dropdown:", chemicalNames);
      setChemicals(chemicalNames);
      
    } catch (error) {
      console.error("❌ Failed to load chemicals:", error);
      setChemicals([]);
    }
  };

  // Check if chemical is selected (handles both string and object formats)
  const isChemicalSelected = (chemicalName) => {
    return selectedChemicals.some(chem => {
      if (typeof chem === 'string') {
        return chem === chemicalName;
      } else if (chem && typeof chem === 'object') {
        return chem.name === chemicalName;
      }
      return false;
    });
  };

  // Get selected chemical object
  const getSelectedChemical = (chemicalName) => {
    return selectedChemicals.find(chem => {
      if (typeof chem === 'string') {
        return chem === chemicalName;
      } else if (chem && typeof chem === 'object') {
        return chem.name === chemicalName;
      }
      return false;
    });
  };

  const handleDropdownPress = () => {
    if (disabled) {
      Alert.alert("Start Service Required", "Please start the service before selecting chemicals.");
      return;
    }
    
    // Reload chemicals when opening dropdown
    if (!showDropdown) {
      loadChemicals();
    }
    
    setShowDropdown(!showDropdown);
    setSearchText('');
  };

  const toggleChemical = (chemicalName) => {
    if (disabled || !editable) {
      Alert.alert("Action Disabled", disabled ? "Start the service first" : "Editing is disabled");
      return;
    }
    
    // Check if already selected
    if (isChemicalSelected(chemicalName)) {
      // Remove it
      const newSelected = selectedChemicals.filter(chem => {
        if (typeof chem === 'string') {
          return chem !== chemicalName;
        } else if (chem && typeof chem === 'object') {
          return chem.name !== chemicalName;
        }
        return true;
      });
      onChemicalsChange(newSelected);
    } else {
      // Show details modal to get concentration and volume
      setSelectedChemical(chemicalName);
      setConcentration('');
      setVolume('');
      setShowDetailsModal(true);
    }
  };

  const saveChemicalWithDetails = () => {
    if (!selectedChemical) return;
    
    const formattedConcentration = concentration && !concentration.includes('%') 
      ? `${concentration}%` 
      : concentration;
    
    const formattedVolume = volume && !volume.includes('ml')
      ? `${volume}ml`
      : volume;
    
    const chemicalObj = {
      name: selectedChemical,
      concentration: formattedConcentration,
      concentrationPercent: formattedConcentration, // Keep both for compatibility
      volume: formattedVolume,
      volumeMl: formattedVolume // Keep both for compatibility
    };
    
    const newSelected = [...selectedChemicals, chemicalObj];
    onChemicalsChange(newSelected);
    
    setShowDetailsModal(false);
    setSelectedChemical(null);
    setConcentration('');
    setVolume('');
  };

  // Update the removeChemical function to properly handle both string and object formats:
  const removeChemical = (chemicalNameToRemove) => {
    if (disabled || !editable) return;
    
    const newSelected = selectedChemicals.filter(chem => {
      if (typeof chem === 'string') {
        return chem !== chemicalNameToRemove;
      } else {
        // Try multiple possible property names to match
        const name = chem.name || chem.chemicalName || chem.chemical;
        return name !== chemicalNameToRemove;
      }
    });
    onChemicalsChange(newSelected);
  };

  const clearSelected = () => {
    if (disabled || !editable) return;
    onChemicalsChange([]);
  };

  // Make sure this function exists in your ChemicalsDropdown component:
  const getChemicalDisplayName = (chemical) => {
    if (!chemical) return 'Unknown';
    
    if (typeof chemical === 'string') {
      return chemical;
    }
    
    // Try multiple possible property names
    return chemical.name || chemical.chemicalName || chemical.chemical || 'Unknown Chemical';
  };

  const filteredChemicals = chemicals.filter(chemicalName => {
    if (!chemicalName) return false;
    return chemicalName.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <View style={styles.container}>
      {/* Selected Chemicals Display - GREEN BLOCKS */}
      {selectedChemicals.length > 0 && (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedTitle}>Selected Chemicals:</Text>
            {editable && !disabled && (
              <TouchableOpacity onPress={clearSelected}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.selectedList}>
            {selectedChemicals.map((chemical, index) => {
              const chemicalName = getChemicalDisplayName(chemical);
              const chemicalConc = typeof chemical === 'string' ? '' : (chemical.concentration || chemical.concentrationPercent || '');
              const chemicalVol = typeof chemical === 'string' ? '' : (chemical.volume || chemical.volumeMl || '');
              
              return (
                <View key={`chemical-${index}`} style={styles.chemicalChip}>
                  <View style={styles.chemicalChipContent}>
                    <Text style={styles.chemicalChipText}>
                      {chemicalName?.trim() || 'Unnamed Chemical'}
                    </Text>
                    {(chemicalConc || chemicalVol) && (
                      <Text style={styles.chemicalChipDetails}>
                        {[chemicalConc, chemicalVol].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                  {editable && !disabled && (
                    <TouchableOpacity 
                      onPress={() => removeChemical(chemicalName)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Dropdown Trigger */}
      <TouchableOpacity
        style={[styles.dropdownTrigger, disabled && styles.disabledTrigger]}
        onPress={handleDropdownPress}
        disabled={disabled}
      >
        <Text style={[
          styles.dropdownText,
          !selectedChemicals.length && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {selectedChemicals.length > 0 
            ? `${selectedChemicals.length} chemical${selectedChemicals.length > 1 ? 's' : ''} selected` 
            : 'Select chemicals used'}
        </Text>
        <Text style={[styles.dropdownArrow, disabled && styles.disabledText]}>
          {showDropdown ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Debug info */}
      <Text style={styles.debugText}>
        Available chemicals: {chemicals.length}
      </Text>

      {/* Dropdown Menu */}
      {showDropdown && !disabled && editable && (
        <View style={styles.dropdownMenu}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search chemicals..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus={true}
            />
          </View>

          {/* Chemicals List */}
          <ScrollView 
            style={styles.listContainer}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {filteredChemicals.length > 0 ? (
              filteredChemicals.map((chemicalName, index) => {
                const isSelected = isChemicalSelected(chemicalName);
                const selectedChem = getSelectedChemical(chemicalName);
                
                return (
                  <TouchableOpacity
                    key={`${chemicalName}-${index}`}
                    style={[
                      styles.item,
                      isSelected && styles.itemSelected
                    ]}
                    onPress={() => toggleChemical(chemicalName)}
                  >
                    <View style={styles.itemContent}>
                      <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected
                      ]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={[
                          styles.itemText,
                          isSelected && styles.itemTextSelected
                        ]}>
                          {chemicalName}
                        </Text>
                        {selectedChem && (selectedChem.concentration || selectedChem.volume) && (
                          <Text style={styles.itemDetails}>
                            {[selectedChem.concentration, selectedChem.volume].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText ? 'No chemicals found' : 'No chemicals available'}
                </Text>
                <TouchableOpacity onPress={loadChemicals}>
                  <Text style={styles.retryText}>Tap to reload</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowDropdown(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chemical Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedChemical(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Details for {selectedChemical}</Text>
            
            <Text style={styles.modalLabel}>Concentration (%)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 10"
              value={concentration.replace('%', '')}
              onChangeText={setConcentration}
              keyboardType="numeric"
              editable={!disabled}
            />
            
            <Text style={styles.modalLabel}>Volume (ml)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 500"
              value={volume.replace('ml', '')}
              onChangeText={setVolume}
              keyboardType="numeric"
              editable={!disabled}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedChemical(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, disabled && styles.disabledSaveButton]}
                onPress={saveChemicalWithDetails}
                disabled={disabled}
              >
                <Text style={[styles.saveButtonText, disabled && styles.disabledSaveText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  selectedContainer: {
    marginBottom: 12,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center', // Add this
    marginHorizontal: -4, // Compensate for margins
  },
  // GREEN BLOCK STYLES
  chemicalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f9c8d',
    paddingHorizontal: 12,
    paddingVertical: 10, // Increased for better height
    borderRadius: 20, // More rounded like web version
    marginRight: 8,
    marginBottom: 8,
    minHeight: 40, // Ensure minimum height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chemicalChipContent: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center', // Center content vertically
    minHeight: 24,
  },
  chemicalChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false, // Fix Android text alignment
    textAlignVertical: 'center',
  },
  chemicalChipDetails: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20, // Fix vertical alignment of X
    textAlign: 'center',
    includeFontPadding: false,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
  },
  disabledTrigger: {
    backgroundColor: '#e9ecef',
    borderColor: '#ced4da',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  disabledText: {
    color: '#6c757d',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
    maxHeight: 300,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  listContainer: {
    maxHeight: 200,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemSelected: {
    backgroundColor: '#f0f9f8',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1f9c8d',
    borderColor: '#1f9c8d',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  itemTextSelected: {
    color: '#1f9c8d',
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  retryText: {
    fontSize: 13,
    color: '#1f9c8d',
    textDecorationLine: 'underline',
    marginTop: 5,
  },
  doneButton: {
    backgroundColor: '#1f9c8d',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#1f9c8d',
  },
  disabledSaveButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledSaveText: {
    color: 'rgba(255,255,255,0.7)',
  },
});