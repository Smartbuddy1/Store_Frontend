export const t = (key) => {
  const lang = localStorage.getItem('app_lang') || 'en';
  if (lang === 'en') return key;

  const dict = {
    // Layout & Navigation
    'Dashboard': 'डॅशबोर्ड',
    'Item Master': 'वस्तूंची यादी',
    'Stock In': 'माल आवक (In)',
    'Stock Out': 'माल जावक (Out)',
    'Current Stock': 'शिल्लक माल (Stock)',
    'Alerts': 'अलर्ट्स (Alerts)',
    'Tools Tracker': 'टूल्स ट्रॅकर',
    'Masters / Settings': 'मास्टर्स / सेटिंग्ज',
    'Main Menu': 'मुख्य मेनू',
    'Secure Logout': 'लॉगआउट',
    
    // Page Headers & Descriptions
    'Welcome to': 'स्वागत आहे',
    'Dashboard': 'डॅशबोर्ड',
    'Hello Admin, here is your system overview.': 'नमस्कार ॲडमिन, येथे तुमची सिस्टम माहिती आहे.',
    'Stock Out (Dispatch)': 'माल जावक (Dispatch)',
    'Tools Tracking': 'टूल्स ट्रॅकिंग',
    'Manage all store items': 'सर्व स्टोअर वस्तूंचे व्यवस्थापन करा',
    'Record incoming inventory': 'नवीन माल जमा करा',
    'Record outgoing inventory and dispatches': 'माल जावक नोंदवा',
    'View real-time inventory status': 'सध्याचा शिल्लक माल तपासा',
    'Monitor items that need immediate attention or restocking': 'संपत आलेल्या वस्तू तपासा',
    'Track borrowed tools and equipment': 'वापरायला दिलेले टूल्स तपासा',
    'Manage system configurations': 'सिस्टीम सेटिंग्ज व्यवस्थापन',
    
    // Stats
    'Total Items': 'एकूण वस्तू',
    'Low Stock': 'कमी माल',
    'Out of Stock': 'संपलेला माल',
    'Total Qty IN': 'एकूण आवक संख्या',
    'Total Qty OUT': 'एकूण जावक संख्या',
    'Quick Actions': 'जलद क्रिया',
    'Create new master item': 'नवीन वस्तूची नोंद करा',
    'Record incoming items': 'आलेल्या मालाची नोंद करा',
    'Dispatch inventory': 'मालाची जावक करा',
    'Record new tool': 'नवीन टूलची नोंद करा',
    'Recent Stock IN': 'अलीकडील माल आवक',
    'Recent Stock OUT': 'अलीकडील माल जावक',
    
    // Buttons
    'Add Tool': 'नवीन टूल जोडा',
    'Add New Item': 'नवीन वस्तू जोडा',
    'Add Stock In': 'माल आवक करा',
    'Add Dispatch': 'माल जावक करा',
    'Record Tool Handover': 'टूल दिल्याची नोंद करा',
    'Save Changes': 'बदल जतन करा',
    'Cancel': 'रद्द करा',
    'Dispatch': 'पाठवा (Dispatch)',
    
    // Table Headers
    'ITEM CODE': 'वस्तूचा कोड',
    'ITEM NAME': 'वस्तूचे नाव',
    'ITEM NAME (AUTO)': 'वस्तूचे नाव (ऑटो)',
    'CATEGORY': 'कॅटेगरी',
    'CATEGORY (AUTO)': 'कॅटेगरी (ऑटो)',
    'UNIT': 'युनिट',
    
    // General
    'Please fill all mandatory fields.': 'कृपया सर्व माहिती भरा.',
    
    // Tools Form
    'Add New Tool': 'नवीन टूल जोडा',
    'Save Tool': 'टूल सेव्ह करा',
    'Select Tool': 'टूल निवडा',
    'Select Helper': 'व्यक्ती निवडा',
    'Issue Time': 'देण्याची वेळ',
    'MIN STOCK': 'किमान माल',
    'CURRENT STOCK': 'शिल्लक माल',
    'CURRENT QTY': 'सध्याची संख्या',
    'TOTAL IN': 'एकूण आवक',
    'TOTAL OUT': 'एकूण जावक',
    'STATUS': 'स्थिती',
    'DATE': 'तारीख',
    'SOURCE': 'कुठून आले',
    'RECEIVED FROM': 'कुठून आले',
    'HANDOVER TO': 'कोणाला दिले',
    'QUANTITY': 'संख्या',
    'QUANTITY ADDED': 'आवक संख्या',
    'QUANTITY DISPATCHED': 'जावक संख्या',
    'HELPER NAME': 'हेल्परचे नाव',
    'TOOL NAME': 'टूलचे नाव',
    'NAME': 'नाव',
    'TOOL CODE': 'टूलचा कोड',
    'OUT TIME': 'बाहेर गेल्याची वेळ',
    'RETURN TIME': 'परत आल्याची वेळ',
    'ACTION / STATUS': 'अॅक्शन / स्थिती',
    'ACTION': 'अॅक्शन्स',
    'ACTIONS': 'अॅक्शन्स',
    'ROLE': 'रोल',
    'PREFIX CODE': 'प्रीफिक्स कोड',
    'CATEGORY NAME': 'कॅटेगरीचे नाव',
    
    // Form Labels
    'Date': 'तारीख',
    'Item Code': 'वस्तूचा कोड',
    'Item Name (Auto)': 'वस्तूचे नाव (ऑटो)',
    'Item Name': 'वस्तूचे नाव',
    'Category': 'कॅटेगरी',
    'Category (Auto)': 'कॅटेगरी (ऑटो)',
    'Quantity Added': 'आवक संख्या',
    'Quantity Dispatched': 'जावक संख्या',
    'Record Dispatch': 'जावक नोंदवा',
    'Stock Out Details': 'जावक माहिती',
    'Stock In Details': 'आवक माहिती',
    'Item Details': 'वस्तूची माहिती',
    'Edit Item': 'माहिती बदला',
    'Record Stock In': 'आवक नोंदवा',
    'Edit Stock In': 'आवक माहिती बदला',
    'Received From': 'कुठून आले',
    'Handover To': 'कोणाला दिले',
    'Select Category': 'कॅटेगरी निवडा',
    'Unit': 'युनिट',
    'Minimum Stock Alert Level': 'किमान मालाची पातळी',
    
    // Stock Status
    'IN STOCK': 'उपलब्ध',
    'LOW STOCK': 'कमी माल',
    'OUT OF STOCK': 'माल संपला',
  };

  return dict[key] || key;
};
