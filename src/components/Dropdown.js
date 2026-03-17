//Dropdown.js - Alternative with Modal for Android
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from "react-native";

const Dropdown = ({ label, options, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const measurePosition = (event) => {
    event.target.measure((x, y, width, height, pageX, pageY) => {
      setDropdownPosition({
        top: pageY + height,
        left: pageX,
        width: width,
      });
    });
  };

  const renderDropdownContent = () => (
    <View style={[
      styles.dropdownMenu,
      Platform.OS === 'android' && {
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }
    ]}>
      <ScrollView
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={false}
        overScrollMode="always"
        persistentScrollbar={true}
        style={styles.scrollView}
      >
        {options.map((item) => (
          <TouchableOpacity
            key={item.value.toString()}
            style={styles.option}
            onPress={() => {
              onSelect(item.value);
              setOpen(false);
            }}
          >
            <Text style={styles.optionText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.input}
        onPress={(event) => {
          if (Platform.OS === 'android') {
            measurePosition(event);
          }
          setOpen(!open);
        }}
        onLayout={(event) => {
          if (Platform.OS === 'android') {
            measurePosition(event);
          }
        }}
      >
        <Text style={styles.inputText}>
          {options.find(o => o.value === selected)?.label || "Select"}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        open && renderDropdownContent()
      ) : (
        <Modal
          visible={open}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            onPress={() => setOpen(false)}
            activeOpacity={1}
          >
            {renderDropdownContent()}
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

export default Dropdown;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: "relative",
    zIndex: 1000,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f8f9fa",
  },
  inputText: { fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 4,
    elevation: 10,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    ...Platform.select({
      ios: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
      },
      android: {
        marginHorizontal: 20,
        width: '90%',
      },
    }),
  },
  scrollView: {
    flex: 1,
    borderRadius: 10,
  },
  option: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: { fontSize: 16 },
});