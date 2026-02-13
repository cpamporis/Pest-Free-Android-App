// RootApp.js - COMPLETE VERSION WITH REPORT REFRESH
import React, { useState } from "react";
import { View, Text } from "react-native";
import LoginScreen from "./screens/LoginScreen";
import AdminHomeScreen from "./screens/Admin/AdminHomeScreen";
import TechnicianHomeScreen from "./screens/Technician/TechnicianHomeScreen";
import MapScreen from "./screens/Technician/MyocideScreen";
import NavigationScreen from "./screens/Technician/NavigationScreen";
import DisinfectionScreen from "./screens/Technician/DisinfectionScreen";
import InsecticideScreen from "./screens/Technician/InsecticideScreen";
import SpecialServicesScreen from "./screens/Technician/SpecialServicesScreen";
import ReportScreen from "./screens/Technician/ReportScreen";
import CustomerHomeScreen from "./screens/Customer/CustomerHomeScreen";
import CustomerVisitsScreen from "./screens/Customer/CustomerVisitsScreen";
import CustomerProfile from "./screens/Admin/CustomerProfile";
import PasswordRecovery from "./screens/PasswordRecovery";

// Import debug
console.log("=== COMPREHENSIVE IMPORT DEBUG ===");

const checkImport = (name, value) => {
  console.log(`${name}:`, {
    exists: !!value,
    type: typeof value,
    isFunction: typeof value === 'function',
    isObject: typeof value === 'object' && value !== null,
    name: value?.name || value?.constructor?.name || 'no name',
  });
};

checkImport("DisinfectionScreen", DisinfectionScreen);
checkImport("InsecticideScreen", InsecticideScreen);
checkImport("SpecialServicesScreen", SpecialServicesScreen);
checkImport("ReportScreen", ReportScreen);
checkImport("MapScreen", MapScreen || undefined);

export default function RootApp() {
  const [loggedTechnician, setLoggedTechnician] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
  const [loggedCustomer, setLoggedCustomer] = useState(null);
  const [customerView, setCustomerView] = useState("home"); 
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [adminView, setAdminView] = useState("home"); 
  const [adminCustomerId, setAdminCustomerId] = useState(null);
  const [authView, setAuthView] = useState("login"); 

  const handleLogout = () => {
    setLoggedTechnician(null);
    setIsAdmin(false);
    setCurrentCustomer(null);
    setCurrentSession(null);
    setShowNavigation(false);
    setShowReport(false);
    setReportContext(null);
    setReportRefreshKey(0);
    setLoggedCustomer(null);
  };

  // Report refresh function
  const refreshReport = () => {
    console.log("🔄 Refreshing report...");
    setReportRefreshKey(prev => prev + 1);
  };

  // Handle report generation
  const handleGenerateReport = (context) => {
    console.log("📄 Generating report with context:", {
      visitId: context?.visitId,
      serviceType: context?.serviceType
    });
    
    // Add refresh function to context
    const enhancedContext = {
      ...context,
      onRefresh: refreshReport
    };
    
    setReportContext(enhancedContext);
    setShowReport(true);
  };

  // 🧑 CUSTOMER FLOW
  if (loggedCustomer) {
    // 1️⃣ Customer Home
    if (customerView === "home") {
      return (
        <CustomerHomeScreen
          customer={loggedCustomer}
          onLogout={handleLogout}
          onViewVisits={() => setCustomerView("visits")}
        />
      );
    }

    // 2️⃣ Customer Visits List
    if (customerView === "visits") {
      return (
        <CustomerVisitsScreen
          onBack={() => setCustomerView("home")}
          onSelectVisit={(visit) => {
            setSelectedVisit(visit);
            setCustomerView("report");
          }}
        />
      );
    }

    // 3️⃣ Read-only Report
    if (customerView === "report" && selectedVisit) {
      return (
        <ReportScreen
          context={{
            visitId: selectedVisit.visit_id,
            serviceType: selectedVisit.service_type,
            readOnly: true
          }}
          onBack={() => {
            setSelectedVisit(null);
            setCustomerView("visits");
          }}
        />
      );
    }
  }


  // 1️⃣ LOGIN (LAST)
  if (!loggedTechnician && !isAdmin && !loggedCustomer) {
    if (authView === "passwordRecovery") {
      return (
        <PasswordRecovery
          onBack={() => setAuthView("login")}
          onDone={() => setAuthView("login")}
        />
      );
    }

    return (
      <LoginScreen
        onAdminLogin={() => setIsAdmin(true)}
        onTechnicianLogin={(tech) => setLoggedTechnician(tech)}
        onCustomerLogin={(customer) => setLoggedCustomer(customer)}
        onPasswordRecovery={() => setAuthView("passwordRecovery")}
      />
    );
  }

  // 2️⃣ ADMIN FLOW
  if (isAdmin) {
    if (adminView === "home") {
      return (
        <AdminHomeScreen
          onLogout={handleLogout}
          onOpenCustomerProfile={(customerId) => {
            setAdminCustomerId(customerId);
            setAdminView("customerProfile");
          }}
        />
      );
    }

    if (adminView === "customerProfile" && adminCustomerId) {
      return (
        <CustomerProfile
          customerId={adminCustomerId}
          onBack={() => {
            setAdminCustomerId(null);
            setAdminView("home");
          }}
        />
      );
    }
  }

  // 3️⃣ NAVIGATION SCREEN
  if (showNavigation && currentCustomer) {
    return (
      <NavigationScreen
        customer={currentCustomer}
        technician={loggedTechnician}
        onBack={() => setShowNavigation(false)}
        
        onNavigateToService={() => setShowNavigation(false)}
      />
    );
  }

  // 4️⃣ REPORT SCREEN (with refresh key)
  if (showReport && reportContext) {
    return (
      <ReportScreen
        key={`report-${reportRefreshKey}`} // This forces re-render when key changes
        context={reportContext}
        onBack={() => {
          setShowReport(false);
          setReportContext(null);
        }}
      />
    );
  }

  // 5️⃣ TECHNICIAN HOME
  if (loggedTechnician && !currentCustomer) {
    return (
      <TechnicianHomeScreen
        technician={loggedTechnician}
        onLogout={handleLogout}
        onSelectCustomer={(customer, session) => {
          console.log("📱 RootApp received customer selection:", {
            customerName: customer?.customerName,
            sessionStatus: session?.status,
            sessionVisitId: session?.visitId
          });
          setCurrentCustomer(customer);
          setCurrentSession(session || null);
        }}
        onNavigateToCustomer={(customer) => {
          setCurrentCustomer(customer);
          setShowNavigation(true);
        }}
      />
    );
  }

  // 6️⃣ SERVICE SCREENS
  if (loggedTechnician && currentCustomer && !showNavigation && !showReport) {
    const serviceType = currentSession?.serviceType || "myocide";
    
    console.log("📱 RootApp routing to service screen:", {
      serviceType,
      customer: currentCustomer?.customerName,
      session: {
        status: currentSession?.status,
        visitId: currentSession?.visitId,
        appointmentId: currentSession?.appointmentId
      }
    });
    
    // Common props for all service screens
    const commonProps = {
      technician: loggedTechnician,
      customer: currentCustomer,
      session: currentSession || {},
      onBack: () => {
        setCurrentCustomer(null);
        setCurrentSession(null);
      },
      onNavigate: () => {
        setShowNavigation(true);
      },
      onGenerateReport: handleGenerateReport
    };
    
    // Render the appropriate screen based on service type
    switch (serviceType) {
      case "disinfection":
        return <DisinfectionScreen {...commonProps} />;
      case "insecticide":
        return <InsecticideScreen {...commonProps} />;
      case "special":
        return <SpecialServicesScreen {...commonProps} />;
      case "myocide":
      default:
        return <MapScreen {...commonProps} />;
    }
  }

  return null;
}