import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText,
  Calendar, Clock, User, Camera, CreditCard, Home, Settings,
  ChevronLeft, ChevronRight, Upload, Edit2, Save, X, Plus,
  Sun, Star, Coffee, Award, Briefcase, Heart, BookOpen, Menu
} from 'lucide-react';
import './staff.css';

const API = import.meta.env.VITE_API_URL || '/api';
const kind = 'staff';
const ALLOWED_ROLES = ['TECHNICIAN','STAFF','HUB_MANAGER','CENTRAL_ADMIN','SUPER_ADMIN'];

// ── Language Context ──
const LangContext = createContext({ lang: 'en', t: k => k });

const TRANSLATIONS = {
  en: {
    dashboard:'Dashboard', myWorks:'My Works', holidays:'Holidays', leave:'Leave', profile:'Profile',
    signOut:'Sign Out', goodMorning:'Good morning', goodAfternoon:'Good afternoon', goodEvening:'Good evening',
    operationsOverview:'Your operations overview at a glance.', openJobs:'Open Jobs', myWorksLabel:'My Works',
    activeJobs:'Active Jobs', live:'Live', myWorksSummary:'My Works Summary', lowStockAlert:'Low Stock Alert',
    pending:'Pending', completed:'Completed', total:'Total', noWorksAdded:'No works added yet.',
    holidaysTitle:'Holidays', publicRegionalHolidays:'Public and regional holidays for your state.',
    nextHoliday:'Next Holiday', days:'days', allMonths:'All months',
    leaveManagement:'Leave Management', applyTrackApprovals:'Apply for leave and track approvals.',
    myProfile:'My Profile', managePersonalDetails:'Manage your personal details and preferences.',
    personal:'Personal', documents:'Documents', address:'Address', settings:'Settings',
    save:'Save', cancel:'Cancel', addWork:'Add Work', addNewWork:'Add New Work', editWork:'Edit Work',
    workTitle:'Work Title', description:'Description', priority:'Priority', dueDate:'Due Date', notes:'Notes',
    high:'High', medium:'Medium', low:'Low', update:'Update', saveWork:'Save Work',
    noWorks:'No works', addFirstWork:'Add your first work item to get started.',
    noPendingWorks:'No pending works right now.', noCompletedWorks:'No completed works right now.',
    pendingLeaves:'pending leave', pendingWork:'pending work',
    applyForLeave:'Apply for Leave', leaveHistory:'Leave History', balance:'Balance',
    pushNotifications:'Push Notifications', language:'Language', fontSize:'Font Size',
    getAlerts:'Get alerts for job updates and leave status', interfaceLanguage:'Interface language',
    adjustTextSize:'Adjust text size for readability', small:'Small', big:'Large',
    fullName:'Full Name', email:'Email', phoneNumber:'Phone Number', dateOfBirth:'Date of Birth', gender:'Gender',
    identityDocuments:'Identity Documents', streetAddress:'Street Address', city:'City', state:'State', pinCode:'PIN Code',
    appSettings:'App Settings', profileSaved:'Profile saved successfully!',
    submitApplication:'Submit Application', leavePendingApproval:'Pending Approval',
    approvedLeaves:'Approved Leaves', daysTaken:'Days Taken', totalApplied:'Total Applied',
  },
  hi: {
    dashboard:'डैशबोर्ड', myWorks:'मेरे कार्य', holidays:'छुट्टियाँ', leave:'अवकाश', profile:'प्रोफ़ाइल',
    signOut:'साइन आउट', goodMorning:'शुभ प्रभात', goodAfternoon:'शुभ दोपहर', goodEvening:'शुभ संध्या',
    operationsOverview:'आपके संचालन का अवलोकन।', openJobs:'खुली नौकरियां', myWorksLabel:'मेरे कार्य',
    activeJobs:'सक्रिय कार्य', live:'लाइव', myWorksSummary:'मेरे कार्य सारांश', lowStockAlert:'कम स्टॉक अलर्ट',
    pending:'लंबित', completed:'पूर्ण', total:'कुल', noWorksAdded:'अभी तक कोई कार्य नहीं जोड़ा गया।',
    holidaysTitle:'छुट्टियाँ', publicRegionalHolidays:'आपके राज्य की सार्वजनिक और क्षेत्रीय छुट्टियाँ।',
    nextHoliday:'अगली छुट्टी', days:'दिन', allMonths:'सभी महीने',
    leaveManagement:'अवकाश प्रबंधन', applyTrackApprovals:'अवकाश के लिए आवेदन करें।',
    myProfile:'मेरी प्रोफ़ाइल', managePersonalDetails:'अपनी व्यक्तिगत जानकारी प्रबंधित करें।',
    personal:'व्यक्तिगत', documents:'दस्तावेज़', address:'पता', settings:'सेटिंग्स',
    save:'सहेजें', cancel:'रद्द करें', addWork:'कार्य जोड़ें', addNewWork:'नया कार्य जोड़ें', editWork:'कार्य संपादित करें',
    workTitle:'कार्य शीर्षक', description:'विवरण', priority:'प्राथमिकता', dueDate:'नियत तारीख', notes:'नोट्स',
    high:'उच्च', medium:'मध्यम', low:'निम्न', update:'अपडेट', saveWork:'कार्य सहेजें',
    noWorks:'कोई कार्य नहीं', addFirstWork:'शुरू करने के लिए पहला कार्य जोड़ें।',
    noPendingWorks:'अभी कोई लंबित कार्य नहीं।', noCompletedWorks:'अभी कोई पूर्ण कार्य नहीं।',
    pendingLeaves:'अवकाश लंबित', pendingWork:'कार्य लंबित',
    applyForLeave:'अवकाश के लिए आवेदन करें', leaveHistory:'अवकाश इतिहास', balance:'शेष',
    pushNotifications:'पुश अधिसूचनाएं', language:'भाषा', fontSize:'फ़ॉन्ट आकार',
    getAlerts:'नौकरी अपडेट के लिए अलर्ट प्राप्त करें', interfaceLanguage:'इंटरफ़ेस भाषा',
    adjustTextSize:'पढ़ने के लिए टेक्स्ट आकार समायोजित करें', small:'छोटा', big:'बड़ा',
    fullName:'पूरा नाम', email:'ईमेल', phoneNumber:'फ़ोन नंबर', dateOfBirth:'जन्म तिथि', gender:'लिंग',
    identityDocuments:'पहचान दस्तावेज़', streetAddress:'सड़क पता', city:'शहर', state:'राज्य', pinCode:'पिन कोड',
    appSettings:'ऐप सेटिंग्स', profileSaved:'प्रोफ़ाइल सफलतापूर्वक सहेजी गई!',
    submitApplication:'आवेदन जमा करें', leavePendingApproval:'अनुमोदन की प्रतीक्षा में',
    approvedLeaves:'स्वीकृत अवकाश', daysTaken:'लिए गए दिन', totalApplied:'कुल आवेदित',
  },
  te: {
    dashboard:'డాష్‌బోర్డ్', myWorks:'నా పనులు', holidays:'సెలవులు', leave:'సెలవు', profile:'ప్రొఫైల్',
    signOut:'సైన్ అవుట్', goodMorning:'శుభోదయం', goodAfternoon:'శుభ మధ్యాహ్నం', goodEvening:'శుభ సాయంత్రం',
    operationsOverview:'మీ కార్యకలాపాల అవలోకనం.', openJobs:'తెరిచిన ఉద్యోగాలు', myWorksLabel:'నా పనులు',
    activeJobs:'చురుకైన ఉద్యోగాలు', live:'లైవ్', myWorksSummary:'నా పని సారాంశం', lowStockAlert:'తక్కువ స్టాక్ హెచ్చరిక',
    pending:'పెండింగ్', completed:'పూర్తయింది', total:'మొత్తం', noWorksAdded:'ఇంకా పనులు జోడించబడలేదు.',
    holidaysTitle:'సెలవులు', publicRegionalHolidays:'మీ రాష్ట్రానికి సెలవులు.',
    nextHoliday:'తదుపరి సెలవు', days:'రోజులు', allMonths:'అన్ని నెలలు',
    leaveManagement:'సెలవు నిర్వహణ', applyTrackApprovals:'సెలవుకు దరఖాస్తు చేయండి.',
    myProfile:'నా ప్రొఫైల్', managePersonalDetails:'మీ వ్యక్తిగత వివరాలు నిర్వహించండి.',
    personal:'వ్యక్తిగత', documents:'పత్రాలు', address:'చిరునామా', settings:'సెట్టింగులు',
    save:'సేవ్ చేయండి', cancel:'రద్దు చేయండి', addWork:'పని జోడించండి', addNewWork:'కొత్త పని జోడించండి', editWork:'పని సవరించండి',
    workTitle:'పని శీర్షిక', description:'వివరణ', priority:'ప్రాధాన్యత', dueDate:'గడువు తేదీ', notes:'నోట్స్',
    high:'అధిక', medium:'మధ్యమ', low:'తక్కువ', update:'అప్‌డేట్', saveWork:'పని సేవ్ చేయండి',
    noWorks:'పనులు లేవు', addFirstWork:'మొదటి పనిని జోడించండి.',
    noPendingWorks:'ప్రస్తుతం పెండింగ్ పనులు లేవు.', noCompletedWorks:'ప్రస్తుతం పూర్తయిన పనులు లేవు.',
    pendingLeaves:'సెలవు పెండింగ్', pendingWork:'పని పెండింగ్',
    applyForLeave:'సెలవుకు దరఖాస్తు చేయండి', leaveHistory:'సెలవు చరిత్ర', balance:'బాలెన్స్',
    pushNotifications:'పుష్ నోటిఫికేషన్లు', language:'భాష', fontSize:'ఫాంట్ పరిమాణం',
    getAlerts:'పని అప్‌డేట్‌ల కోసం హెచ్చరికలు పొందండి', interfaceLanguage:'ఇంటర్ఫేస్ భాష',
    adjustTextSize:'చదవడానికి వచన పరిమాణం సర్దుబాటు చేయండి', small:'చిన్న', big:'పెద్ద',
    fullName:'పూర్తి పేరు', email:'ఇమెయిల్', phoneNumber:'ఫోన్ నంబర్', dateOfBirth:'పుట్టిన తేదీ', gender:'లింగం',
    identityDocuments:'గుర్తింపు పత్రాలు', streetAddress:'వీధి చిరునామా', city:'నగరం', state:'రాష్ట్రం', pinCode:'పిన్ కోడ్',
    appSettings:'యాప్ సెట్టింగులు', profileSaved:'ప్రొఫైల్ విజయవంతంగా సేవ్ చేయబడింది!',
    submitApplication:'దరఖాస్తు సమర్పించండి', leavePendingApproval:'ఆమోదం కోసం పెండింగ్',
    approvedLeaves:'అనుమతించిన సెలవులు', daysTaken:'తీసుకున్న రోజులు', totalApplied:'మొత్తం దరఖాస్తు చేసారు',
  },
  ta: {
    dashboard:'டாஷ்போர்டு', myWorks:'என் பணிகள்', holidays:'விடுமுறைகள்', leave:'விடுப்பு', profile:'சுயவிவரம்',
    signOut:'வெளியேறு', goodMorning:'காலை வணக்கம்', goodAfternoon:'மதிய வணக்கம்', goodEvening:'மாலை வணக்கம்',
    operationsOverview:'உங்கள் செயல்பாட்டு கண்ணோட்டம்.', openJobs:'திறந்த வேலைகள்', myWorksLabel:'என் பணிகள்',
    activeJobs:'செயலில் உள்ள வேலைகள்', live:'நேரடி', myWorksSummary:'என் பணி சுருக்கம்', lowStockAlert:'குறைந்த இருப்பு எச்சரிக்கை',
    pending:'நிலுவையில்', completed:'முடிந்தது', total:'மொத்தம்', noWorksAdded:'இன்னும் பணிகள் சேர்க்கப்படவில்லை.',
    holidaysTitle:'விடுமுறைகள்', publicRegionalHolidays:'உங்கள் மாநிலத்தின் விடுமுறைகள்.',
    nextHoliday:'அடுத்த விடுமுறை', days:'நாட்கள்', allMonths:'எல்லா மாதங்கள்',
    leaveManagement:'விடுப்பு மேலாண்மை', applyTrackApprovals:'விடுப்பு விண்ணப்பிக்கவும்.',
    myProfile:'என் சுயவிவரம்', managePersonalDetails:'உங்கள் தனிப்பட்ட விவரங்களை நிர்வகிக்கவும்.',
    personal:'தனிப்பட்ட', documents:'ஆவணங்கள்', address:'முகவரி', settings:'அமைப்புகள்',
    save:'சேமி', cancel:'ரத்து', addWork:'பணி சேர்க்கவும்', addNewWork:'புதிய பணி சேர்க்கவும்', editWork:'பணி திருத்தவும்',
    workTitle:'பணி தலைப்பு', description:'விளக்கம்', priority:'முன்னுரிமை', dueDate:'கடைசி தேதி', notes:'குறிப்புகள்',
    high:'உயர்', medium:'நடுத்தர', low:'குறைந்த', update:'புதுப்பி', saveWork:'பணி சேமி',
    noWorks:'பணிகள் இல்லை', addFirstWork:'முதல் பணியை சேர்க்கவும்.',
    noPendingWorks:'தற்போது நிலுவை பணிகள் இல்லை.', noCompletedWorks:'தற்போது முடிந்த பணிகள் இல்லை.',
    pendingLeaves:'விடுப்பு நிலுவையில்', pendingWork:'பணி நிலுவையில்',
    applyForLeave:'விடுப்புக்கு விண்ணப்பிக்கவும்', leaveHistory:'விடுப்பு வரலாறு', balance:'இருப்பு',
    pushNotifications:'புஷ் அறிவிப்புகள்', language:'மொழி', fontSize:'எழுத்துரு அளவு',
    getAlerts:'வேலை புதுப்பிப்புகளுக்கு எச்சரிக்கைகள் பெறவும்', interfaceLanguage:'இடைமுகம் மொழி',
    adjustTextSize:'படிக்க உரை அளவை சரிசெய்யவும்', small:'சிறிய', big:'பெரிய',
    fullName:'முழு பெயர்', email:'மின்னஞ்சல்', phoneNumber:'தொலைபேசி எண்', dateOfBirth:'பிறந்த தேதி', gender:'பாலினம்',
    identityDocuments:'அடையாள ஆவணங்கள்', streetAddress:'தெரு முகவரி', city:'நகரம்', state:'மாநிலம்', pinCode:'பின் குறியீடு',
    appSettings:'பயன்பாட்டு அமைப்புகள்', profileSaved:'சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!',
    submitApplication:'விண்ணப்பம் சமர்ப்பிக்கவும்', leavePendingApproval:'அனுமதி நிலுவையில்',
    approvedLeaves:'அனுமதிக்கப்பட்ட விடுப்புகள்', daysTaken:'எடுக்கப்பட்ட நாட்கள்', totalApplied:'மொத்தம் விண்ணப்பிக்கப்பட்டது',
  },
  kn: {
    dashboard:'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', myWorks:'ನನ್ನ ಕಾರ್ಯಗಳು', holidays:'ರಜೆಗಳು', leave:'ರಜೆ', profile:'ಪ್ರೊಫೈಲ್',
    signOut:'ಸೈನ್ ಔಟ್', goodMorning:'ಶುಭ ಬೆಳಗು', goodAfternoon:'ಶುಭ ಮಧ್ಯಾಹ್ನ', goodEvening:'ಶುಭ ಸಂಜೆ',
    operationsOverview:'ನಿಮ್ಮ ಕಾರ್ಯಾಚರಣೆಯ ಅವಲೋಕನ.', openJobs:'ತೆರೆದ ಉದ್ಯೋಗಗಳು', myWorksLabel:'ನನ್ನ ಕಾರ್ಯಗಳು',
    activeJobs:'ಸಕ್ರಿಯ ಉದ್ಯೋಗಗಳು', live:'ಲೈವ್', myWorksSummary:'ನನ್ನ ಕಾರ್ಯ ಸಾರಾಂಶ', lowStockAlert:'ಕಡಿಮೆ ಸ್ಟಾಕ್ ಎಚ್ಚರಿಕೆ',
    pending:'ಬಾಕಿ', completed:'ಪೂರ್ಣಗೊಂಡಿದೆ', total:'ಒಟ್ಟು', noWorksAdded:'ಇನ್ನೂ ಕಾರ್ಯಗಳನ್ನು ಸೇರಿಸಿಲ್ಲ.',
    holidaysTitle:'ರಜೆಗಳು', publicRegionalHolidays:'ನಿಮ್ಮ ರಾಜ್ಯದ ರಜೆಗಳು.',
    nextHoliday:'ಮುಂದಿನ ರಜೆ', days:'ದಿನಗಳು', allMonths:'ಎಲ್ಲಾ ತಿಂಗಳುಗಳು',
    leaveManagement:'ರಜೆ ನಿರ್ವಹಣೆ', applyTrackApprovals:'ರಜೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.',
    myProfile:'ನನ್ನ ಪ್ರೊಫೈಲ್', managePersonalDetails:'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು ನಿರ್ವಹಿಸಿ.',
    personal:'ವೈಯಕ್ತಿಕ', documents:'ದಾಖಲೆಗಳು', address:'ವಿಳಾಸ', settings:'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    save:'ಉಳಿಸಿ', cancel:'ರದ್ದು', addWork:'ಕಾರ್ಯ ಸೇರಿಸಿ', addNewWork:'ಹೊಸ ಕಾರ್ಯ ಸೇರಿಸಿ', editWork:'ಕಾರ್ಯ ಸಂಪಾದಿಸಿ',
    workTitle:'ಕಾರ್ಯ ಶೀರ್ಷಿಕೆ', description:'ವಿವರಣೆ', priority:'ಆದ್ಯತೆ', dueDate:'ಗಡುವು ದಿನಾಂಕ', notes:'ಟಿಪ್ಪಣಿಗಳು',
    high:'ಹೆಚ್ಚು', medium:'ಮಧ್ಯಮ', low:'ಕಡಿಮೆ', update:'ನವೀಕರಿಸಿ', saveWork:'ಕಾರ್ಯ ಉಳಿಸಿ',
    noWorks:'ಕಾರ್ಯಗಳಿಲ್ಲ', addFirstWork:'ಮೊದಲ ಕಾರ್ಯ ಸೇರಿಸಿ.',
    noPendingWorks:'ಪ್ರಸ್ತುತ ಬಾಕಿ ಕಾರ್ಯಗಳಿಲ್ಲ.', noCompletedWorks:'ಪ್ರಸ್ತುತ ಪೂರ್ಣಗೊಂಡ ಕಾರ್ಯಗಳಿಲ್ಲ.',
    pendingLeaves:'ರಜೆ ಬಾಕಿ', pendingWork:'ಕಾರ್ಯ ಬಾಕಿ',
    applyForLeave:'ರಜೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ', leaveHistory:'ರಜೆ ಇತಿಹಾಸ', balance:'ಬಾಕಿ',
    pushNotifications:'ಪುಶ್ ಅಧಿಸೂಚನೆಗಳು', language:'ಭಾಷೆ', fontSize:'ಫಾಂಟ್ ಗಾತ್ರ',
    getAlerts:'ಕಾರ್ಯ ನವೀಕರಣಗಳಿಗೆ ಎಚ್ಚರಿಕೆ ಪಡೆಯಿರಿ', interfaceLanguage:'ಇಂಟರ್ಫೇಸ್ ಭಾಷೆ',
    adjustTextSize:'ಓದಲು ಪಠ್ಯ ಗಾತ್ರ ಸರಿಹೊಂದಿಸಿ', small:'ಚಿಕ್ಕ', big:'ದೊಡ್ಡ',
    fullName:'ಪೂರ್ಣ ಹೆಸರು', email:'ಇಮೇಲ್', phoneNumber:'ಫೋನ್ ನಂಬರ್', dateOfBirth:'ಜನ್ಮ ದಿನಾಂಕ', gender:'ಲಿಂಗ',
    identityDocuments:'ಗುರುತಿನ ದಾಖಲೆಗಳು', streetAddress:'ಬೀದಿ ವಿಳಾಸ', city:'ನಗರ', state:'ರಾಜ್ಯ', pinCode:'ಪಿನ್ ಕೋಡ್',
    appSettings:'ಅಪ್ಲಿಕೇಶನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು', profileSaved:'ಪ್ರೊಫೈಲ್ ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!',
    submitApplication:'ಅರ್ಜಿ ಸಲ್ಲಿಸಿ', leavePendingApproval:'ಅನುಮೋದನೆ ಬಾಕಿ',
    approvedLeaves:'ಅನುಮೋದಿತ ರಜೆಗಳು', daysTaken:'ತೆಗೆದ ದಿನಗಳು', totalApplied:'ಒಟ್ಟು ಅರ್ಜಿ',
  },
};

function useTranslation() { return useContext(LangContext); }

const PORTAL_CFG = {
  staff: { title: 'Staff Portal', accent: 'Service Operations', email: 'staff@ev.local' },
};
const cfg = PORTAL_CFG[kind];

// ── Local storage helpers for new features ──
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ── Axios helper ──
function api() {
  return async (path, opts = {}) => {
    const token = localStorage.getItem('ev_staff_token');
    try {
      const r = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${token}` }, ...opts });
      return r.data;
    } catch (err) {
      if (err.response?.status === 401) {
        const rt = localStorage.getItem('ev_staff_refresh_token');
        if (rt) {
          try {
            const { data } = await axios.post(`${API}/auth/refresh`, { refreshToken: rt });
            localStorage.setItem('ev_staff_token', data.accessToken);
            localStorage.setItem('ev_staff_refresh_token', data.refreshToken);
            const retry = await axios({ baseURL: API, url: path, headers: { Authorization: `Bearer ${data.accessToken}` }, ...opts });
            return retry.data;
          } catch (_) {
            localStorage.removeItem('ev_staff_token');
            localStorage.removeItem('ev_staff_refresh_token');
            window.location.reload(); return;
          }
        } else {
          localStorage.removeItem('ev_staff_token');
          window.location.reload(); return;
        }
      }
      throw err;
    }
  };
}

function useFetch(call, path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    call(path)
      .then(d => { if (alive) setData(d); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path]);
  return { data, loading, error };
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ev_staff_token'));
  const [user, setUser] = useState(null);
  const [creds, setCreds] = useState({ email: cfg.email || '', password: 'Password123!' });
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [authView, setAuthView] = useState('login');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNew, setFpNew] = useState('');
  const [fpBusy, setFpBusy] = useState(false);
  const [fpError, setFpError] = useState('');
  const [lang, setLang] = useState(() => {
    const prof = store.get('ev_staff_profile');
    return prof?.settings?.language || 'en';
  });
  const call = api();
  const t = k => (TRANSLATIONS[lang] || TRANSLATIONS.en)[k] || k;

  useEffect(() => {
    if (!token) return;
    call('/auth/me')
      .then(u => {
        if (!ALLOWED_ROLES.includes(u.role)) {
          localStorage.removeItem('ev_staff_token');
          localStorage.removeItem('ev_staff_refresh_token');
          setToken(null); setUser(null); return;
        }
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('ev_staff_token');
        localStorage.removeItem('ev_staff_refresh_token');
        setToken(null);
      });
  }, []);

  const login = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const res = await axios.post(`${API}/auth/login`, creds);
      const tok = res.data.accessToken;
      const rt  = res.data.refreshToken;
      localStorage.setItem('ev_staff_token', tok);
      if (rt) localStorage.setItem('ev_staff_refresh_token', rt);
      if (!ALLOWED_ROLES.includes(res.data.user.role))
        throw new Error(`This account belongs to the ${res.data.user.role} portal.`);
      setToken(tok); setUser(res.data.user);
    } catch (err) { alert(err.response?.data?.message || 'Login failed'); }
    finally { setBusy(false); }
  };

  const sendFpOtp = async e => {
    e.preventDefault(); setFpBusy(true); setFpError('');
    try {
      await axios.post(`${API}/auth/staff/forgot-password`, { email: fpEmail });
      setAuthView('otp');
    } catch (err) { setFpError(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setFpBusy(false); }
  };

  const verifyFpOtp = async e => {
    e.preventDefault(); setFpBusy(true); setFpError('');
    try {
      await axios.post(`${API}/auth/staff/verify-reset-otp`, { email: fpEmail, otp: fpOtp });
      setAuthView('newpass');
    } catch (err) { setFpError(err.response?.data?.message || 'Invalid OTP'); }
    finally { setFpBusy(false); }
  };

  const resetPassword = async e => {
    e.preventDefault(); setFpBusy(true); setFpError('');
    if (fpNew.length < 6) { setFpError('Password must be at least 6 characters'); setFpBusy(false); return; }
    try {
      await axios.post(`${API}/auth/staff/reset-password`, { email: fpEmail, otp: fpOtp, newPassword: fpNew });
      setAuthView('done');
    } catch (err) { setFpError(err.response?.data?.message || 'Reset failed'); }
    finally { setFpBusy(false); }
  };

  const logout = () => {
    localStorage.removeItem('ev_staff_token');
    localStorage.removeItem('ev_staff_refresh_token');
    setToken(null); setUser(null); setPage('dashboard');
  };

  if (!token) {
    return (
      <LangContext.Provider value={{ lang, t }}>
        <LoginPage
          creds={creds} setCreds={setCreds} onSubmit={login} busy={busy}
          authView={authView} setAuthView={setAuthView}
          fpEmail={fpEmail} setFpEmail={setFpEmail}
          fpOtp={fpOtp} setFpOtp={setFpOtp}
          fpNew={fpNew} setFpNew={setFpNew}
          fpBusy={fpBusy} fpError={fpError}
          sendFpOtp={sendFpOtp} verifyFpOtp={verifyFpOtp} resetPassword={resetPassword}
        />
      </LangContext.Provider>
    );
  }
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <Shell user={user} setUser={setUser} page={page} setPage={setPage} call={call} logout={logout} />
    </LangContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════
function LoginPage({ creds, setCreds, onSubmit, busy, authView, setAuthView,
  fpEmail, setFpEmail, fpOtp, setFpOtp, fpNew, setFpNew, fpBusy, fpError,
  sendFpOtp, verifyFpOtp, resetPassword }) {
  const logoBlock = (
    <>
      <div className="login-logo">
        <div className="logo-icon"><Zap size={22} /></div>
        <span className="logo-text">EV CORE</span>
      </div>
      <p className="login-sub">{cfg.accent}</p>
    </>
  );

  if (authView === 'forgot') return (
    <div className="login-wrap"><div className="login-box">
      {logoBlock}
      <h2 className="login-title">Forgot Password</h2>
      <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>Enter your staff email. A 6-digit OTP will be sent.</p>
      <form onSubmit={sendFpOtp} className="login-form">
        <label>Staff Email<input type="email" value={fpEmail} required onChange={e => setFpEmail(e.target.value)} placeholder="your@email.com" /></label>
        {fpError && <p style={{ color:'#dc2626', fontSize:13, margin:0 }}>{fpError}</p>}
        <button type="submit" disabled={fpBusy}>{fpBusy ? 'Sending OTP…' : 'Send OTP'}</button>
      </form>
      <p style={{ textAlign:'center', marginTop:12 }}>
        <button style={{ background:'none', border:'none', color:'#2563eb', cursor:'pointer', fontSize:13 }} onClick={() => setAuthView('login')}>← Back to Login</button>
      </p>
    </div></div>
  );

  if (authView === 'otp') return (
    <div className="login-wrap"><div className="login-box">
      {logoBlock}
      <h2 className="login-title">Enter OTP</h2>
      <form onSubmit={verifyFpOtp} className="login-form">
        <label>OTP Code<input type="text" value={fpOtp} required maxLength={6} onChange={e => setFpOtp(e.target.value)} placeholder="6-digit code" style={{ letterSpacing:'6px', fontWeight:700, textAlign:'center' }} /></label>
        {fpError && <p style={{ color:'#dc2626', fontSize:13, margin:0 }}>{fpError}</p>}
        <button type="submit" disabled={fpBusy}>{fpBusy ? 'Verifying…' : 'Verify OTP'}</button>
      </form>
    </div></div>
  );

  if (authView === 'newpass') return (
    <div className="login-wrap"><div className="login-box">
      {logoBlock}
      <h2 className="login-title">Set New Password</h2>
      <form onSubmit={resetPassword} className="login-form">
        <label>New Password<input type="password" value={fpNew} required minLength={6} onChange={e => setFpNew(e.target.value)} placeholder="Min 6 characters" /></label>
        {fpError && <p style={{ color:'#dc2626', fontSize:13, margin:0 }}>{fpError}</p>}
        <button type="submit" disabled={fpBusy}>{fpBusy ? 'Saving…' : 'Save New Password'}</button>
      </form>
    </div></div>
  );

  if (authView === 'done') return (
    <div className="login-wrap"><div className="login-box" style={{ textAlign:'center' }}>
      {logoBlock}
      <div style={{ fontSize:48, margin:'24px 0 8px' }}>✅</div>
      <h2 className="login-title">Password Reset!</h2>
      <button style={{ width:'100%', padding:'13px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700 }} onClick={() => setAuthView('login')}>Go to Login</button>
    </div></div>
  );

  return (
    <div className="login-wrap"><div className="login-box">
      {logoBlock}
      <h2 className="login-title">{cfg.title}</h2>
      <form onSubmit={onSubmit} className="login-form">
        <label>Email<input type="email" value={creds.email} onChange={e => setCreds({ ...creds, email: e.target.value })} /></label>
        <label>Password<input type="password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} /></label>
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p style={{ textAlign:'center', marginTop:8 }}>
        <button style={{ background:'none', border:'none', color:'#2563eb', cursor:'pointer', fontSize:13 }} onClick={() => setAuthView('forgot')}>Forgot Password?</button>
      </p>
      <p className="login-hint">Demo — <strong>{cfg.email}</strong> / <strong>Password123!</strong></p>
    </div></div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHELL — VERTICAL SIDEBAR
// ══════════════════════════════════════════════════════════════════
function Shell({ user, setUser, page, setPage, call, logout }) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const NAV_ITEMS = [
    { id: 'dashboard',  labelKey: 'dashboard',   Icon: LayoutDashboard },
    { id: 'my-works',   labelKey: 'myWorks',      Icon: Briefcase },
    { id: 'holidays',   labelKey: 'holidays',     Icon: Calendar },
    { id: 'leave',      labelKey: 'leave',        Icon: Clock },
    { id: 'profile',    labelKey: 'profile',      Icon: User },
  ];

  return (
    <div className="shell-sidebar-layout">
      {/* ── Vertical Sidebar ── */}
      <aside className={'sidebar' + (sidebarCollapsed ? ' collapsed' : '')}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon sm"><Zap size={16} /></div>
            {!sidebarCollapsed && <span className="logo-text">EV CORE</span>}
          </div>
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle sidebar">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              className={'sidebar-nav-item' + (page === id ? ' active' : '')}
              onClick={() => setPage(id)}
              title={sidebarCollapsed ? t(labelKey) : ''}
            >
              <Icon size={18} />
              {!sidebarCollapsed && <span>{t(labelKey)}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => setPage('profile')} style={{ cursor:'pointer' }}>
            {user?.profilePic
              ? <img src={user.profilePic} alt="" className="avatar-img" />
              : <div className="avatar">{user?.name?.[0] ?? '?'}</div>
            }
            {!sidebarCollapsed && (
              <div className="user-info-block">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            )}
          </div>
          <button className="logout-sidebar-btn" onClick={logout} title={t('signOut')}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="mobile-topbar">
        <div className="topnav-logo">
          <div className="logo-icon sm"><Zap size={16} /></div>
          <span className="logo-text">EV CORE</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav">
          {NAV_ITEMS.map(({ id, labelKey, Icon }) => (
            <button key={id} className={'mobile-nav-item' + (page === id ? ' active' : '')}
              onClick={() => { setPage(id); setMobileMenuOpen(false); }}>
              <Icon size={16} />{t(labelKey)}
            </button>
          ))}
          <button className="mobile-nav-item logout-mobile" onClick={logout}><LogOut size={16} />{t('signOut')}</button>
        </div>
      )}

      {/* ── Page Content ── */}
      <div className="page-content-area">
        <PageRouter page={page} call={call} user={user} setUser={setUser} setPage={setPage} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ══════════════════════════════════════════════════════════════════
function PageRouter({ page, call, user, setUser, setPage }) {
  const P = { call, user, setUser, setPage };
  const pages = {
    dashboard: <StaffDashboard {...P} />,
    'my-works': <MyWorks {...P} />,
    holidays: <Holidays {...P} />,
    leave: <Leave {...P} />,
    profile: <Profile {...P} />,
  };
  return pages[page] || pages.dashboard;
}

// ══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════
function PageHeader({ title, sub }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div>
  );
}

function MetricGrid({ metrics }) {
  return (
    <div className="metric-grid">
      {metrics.map(({ label, value, Icon, color }) => (
        <div className="metric-card" key={label}>
          <div className="metric-icon" style={{ background: color + '18', color }}>
            <Icon size={20} />
          </div>
          <div className="metric-body">
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value ?? '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, badge, children, action }) {
  return (
    <div className="card">
      {(title || badge || action) && (
        <div className="card-head">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {title && <div className="card-title">{title}</div>}
            {badge && <span className="badge">{badge}</span>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const STATUS_COLOR = {
  COMPLETED: '#16a34a', ACTIVE: '#2563eb', PENDING: '#d97706',
  CANCELLED: '#dc2626', ASSIGNED: '#7c3aed', HIGH: '#dc2626',
  MEDIUM: '#d97706', LOW: '#16a34a', PAID: '#16a34a', AVAILABLE: '#16a34a',
  IN_USE: '#2563eb', OFFLINE: '#dc2626', 'IN-PROGRESS': '#2563eb',
  APPROVED: '#16a34a', REJECTED: '#dc2626',
};

function DataTable({ rows = [], cols = [] }) {
  if (!rows?.length) return <div className="empty">No records found.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>{cols.map(c => <th key={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r?._id || i}>
              {cols.map(c => {
                const v = r?.[c];
                const color = STATUS_COLOR[v];
                return (
                  <td key={c}>
                    {color
                      ? <span className="status-pill" style={{ background: color + '18', color }}>{v}</span>
                      : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Loader() {
  return (
    <div className="loader-wrap">
      <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
    </div>
  );
}
function Err({ msg }) { return <div className="empty" style={{ color:'#dc2626' }}>Error: {msg}</div>; }

// ══════════════════════════════════════════════════════════════════
// STAFF DASHBOARD
// ══════════════════════════════════════════════════════════════════
function StaffDashboard({ call, user, setPage }) {
  const { t } = useTranslation();
  const { data: jobs, loading: lj } = useFetch(call, '/staff/jobs');
  const leaves = store.get('ev_staff_leaves') || [];
  const myWorks = store.get('ev_staff_works') || [];

  // ── Duty / Attendance state ──
  const [dutyOn, setDutyOn] = useState(() => store.get('ev_staff_duty_on') || false);
  const [dutyStartTime, setDutyStartTime] = useState(() => store.get('ev_staff_duty_start') || null);
  const [showDutyConfirm, setShowDutyConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'on' | 'off'

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'goodMorning' : hour < 17 ? 'goodAfternoon' : 'goodEvening';

  if (lj) return <Loader />;
  const open = jobs?.filter(j => !['COMPLETED','CANCELLED'].includes(j.status)) || [];
  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
  const pendingWorks  = myWorks.filter(w => w.status === 'pending').length;
  const completedWorks = myWorks.filter(w => w.status === 'completed').length;

  const today = new Date();
  const weekday = today.toLocaleDateString('en-IN', { weekday:'long' });
  const dateStr = today.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  // ── Duty helpers ──
  const requestDutyToggle = () => {
    setConfirmAction(dutyOn ? 'off' : 'on');
    setShowDutyConfirm(true);
  };

  const confirmDuty = () => {
    const now = new Date().toISOString();
    const staffName  = user?.name  || 'Staff';
    const staffId    = user?._id   || user?.id || 'staff-001';
    const staffEmail = user?.email || store.get('ev_staff_profile')?.email || '—';
    const staffPhone = store.get('ev_staff_profile')?.phone || '—';
    const hubId      = user?.hubId || 'HUB-001';
    const todayKey   = new Date().toISOString().slice(0, 10);

    if (confirmAction === 'on') {
      // Mark duty ON
      store.set('ev_staff_duty_on', true);
      store.set('ev_staff_duty_start', now);
      setDutyOn(true);
      setDutyStartTime(now);

      // Push to franchisee attendance store
      const allAttendance = store.get('ev_franchise_attendance') || [];
      allAttendance.push({
        id: Date.now().toString(),
        staffId, staffName, staffEmail, staffPhone, hubId,
        date: todayKey,
        dutyIn: now,
        dutyOut: null,
        hoursWorked: null,
        status: 'ON_DUTY',
      });
      store.set('ev_franchise_attendance', allAttendance);
    } else {
      // Mark duty OFF
      const start = store.get('ev_staff_duty_start');
      const inMs  = start ? (new Date() - new Date(start)) : 0;
      const hrs   = (inMs / 3600000).toFixed(2);

      store.set('ev_staff_duty_on', false);
      store.set('ev_staff_duty_start', null);
      setDutyOn(false);
      setDutyStartTime(null);

      // Update franchisee attendance store
      const allAttendance = store.get('ev_franchise_attendance') || [];
      const idx = allAttendance.findLastIndex(a => a.staffId === staffId && a.date === todayKey && !a.dutyOut);
      if (idx !== -1) {
        allAttendance[idx] = { ...allAttendance[idx], dutyOut: now, hoursWorked: parseFloat(hrs), status: 'OFF_DUTY' };
      }
      store.set('ev_franchise_attendance', allAttendance);
    }
    setShowDutyConfirm(false);
  };

  const dutyElapsed = () => {
    if (!dutyOn || !dutyStartTime) return null;
    const ms = new Date() - new Date(dutyStartTime);
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return <>
    {/* Duty Confirmation Modal */}
    {showDutyConfirm && (
      <div className="duty-confirm-overlay">
        <div className="duty-confirm-modal">
          <div className="duty-confirm-icon">{confirmAction === 'on' ? '🟢' : '🔴'}</div>
          <div className="duty-confirm-title">
            {confirmAction === 'on' ? 'Start Duty?' : 'End Duty?'}
          </div>
          <div className="duty-confirm-body">
            {confirmAction === 'on'
              ? 'This will mark you as On Duty. Your attendance time will start now and be sent to your Franchisee.'
              : `This will clock you out. Your total hours today will be recorded and sent to your Franchisee.${dutyStartTime ? ` Elapsed: ${dutyElapsed() || '—'}` : ''}`}
          </div>
          <div className="duty-confirm-btns">
            <button className="btn-ghost" onClick={() => setShowDutyConfirm(false)}>Cancel</button>
            <button
              className={confirmAction === 'on' ? 'btn-duty-on' : 'btn-duty-off'}
              onClick={confirmDuty}
            >
              {confirmAction === 'on' ? '✅ Confirm Duty On' : '🔴 Confirm Duty Off'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Greeting banner */}
    <div className="greeting-banner">
      <div className="greeting-left">
        <div className="greeting-emoji">{hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'}</div>
        <div>
          <div className="greeting-text">{t(greetingKey)}, {user?.name?.split(' ')[0] || 'Staff'}!</div>
          <div className="greeting-date">{weekday}, {dateStr}</div>
        </div>
      </div>
      <div className="greeting-right">
        {pendingWorks > 0 && <span className="greeting-tag orange">⚡ {pendingWorks} {t('pendingWork')}</span>}
        {pendingLeaves > 0 && <span className="greeting-tag blue">📋 {pendingLeaves} {t('pendingLeaves')}</span>}
      </div>
    </div>

    {/* Duty Toggle Card */}
    <div className="duty-toggle-card">
      <div className="duty-toggle-left">
        <div className={'duty-status-dot' + (dutyOn ? ' on' : ' off')} />
        <div>
          <div className="duty-toggle-label">Duty Status</div>
          <div className="duty-toggle-sub">
            {dutyOn
              ? `On Duty · Started at ${new Date(dutyStartTime).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} · ${dutyElapsed() || '0h 0m'} elapsed`
              : 'Off Duty · Toggle to start your shift'}
          </div>
        </div>
      </div>
      <button
        className={'duty-toggle-btn' + (dutyOn ? ' on' : ' off')}
        onClick={requestDutyToggle}
        title={dutyOn ? 'Click to end duty' : 'Click to start duty'}
      >
        <div className="duty-toggle-knob" />
        <span className="duty-toggle-text">{dutyOn ? 'ON' : 'OFF'}</span>
      </button>
    </div>

    <PageHeader title={t('dashboard')} sub={t('operationsOverview')} />

    {/* Clickable KPI Cards — only Open Jobs and My Works */}
    <div className="metric-grid">
      <div className="metric-card metric-card-clickable" onClick={() => setPage && setPage('my-works')}>
        <div className="metric-icon" style={{ background:'#d97706'+'18', color:'#d97706' }}>
          <Activity size={20} />
        </div>
        <div className="metric-body">
          <div className="metric-label">{t('openJobs')}</div>
          <div className="metric-value">{open.length}</div>
        </div>
        <div className="metric-arrow">›</div>
      </div>
      <div className="metric-card metric-card-clickable" onClick={() => setPage && setPage('my-works')}>
        <div className="metric-icon" style={{ background:'#2563eb'+'18', color:'#2563eb' }}>
          <Briefcase size={20} />
        </div>
        <div className="metric-body">
          <div className="metric-label">{t('myWorksLabel')}</div>
          <div className="metric-value">{myWorks.length}</div>
        </div>
        <div className="metric-arrow">›</div>
      </div>
      <div className="metric-card metric-card-clickable" onClick={() => setPage && setPage('leave')}>
        <div className="metric-icon" style={{ background:'#7c3aed'+'18', color:'#7c3aed' }}>
          <Clock size={20} />
        </div>
        <div className="metric-body">
          <div className="metric-label">{t('leavePendingApproval')}</div>
          <div className="metric-value">{pendingLeaves}</div>
        </div>
        <div className="metric-arrow">›</div>
      </div>
      <div className="metric-card metric-card-clickable" onClick={() => setPage && setPage('holidays')}>
        <div className="metric-icon" style={{ background:'#16a34a'+'18', color:'#16a34a' }}>
          <Calendar size={20} />
        </div>
        <div className="metric-body">
          <div className="metric-label">{t('holidays')}</div>
          <div className="metric-value">{new Date().getFullYear()}</div>
        </div>
        <div className="metric-arrow">›</div>
      </div>
    </div>

    <div className="dash-grid-3">
      <Card title={t('activeJobs')} badge={t('live')}>
        <DataTable rows={open?.slice(0, 5)} cols={['serviceType','status','priority','trackingStatus']} />
      </Card>
      <Card title={t('myWorksSummary')}>
        <div className="works-summary">
          <div className="works-sum-item pending">
            <div className="wsval">{pendingWorks}</div>
            <div className="wslabel">{t('pending')}</div>
          </div>
          <div className="works-sum-item completed">
            <div className="wsval">{completedWorks}</div>
            <div className="wslabel">{t('completed')}</div>
          </div>
          <div className="works-sum-item total">
            <div className="wsval">{myWorks.length}</div>
            <div className="wslabel">{t('total')}</div>
          </div>
        </div>
        {myWorks.slice(0, 3).map(w => (
          <div key={w.id} className="work-mini-row">
            <span className="work-mini-title">{w.title}</span>
            <span className="status-pill" style={{ background: (w.status==='completed'?'#16a34a':'#d97706')+'18', color: w.status==='completed'?'#16a34a':'#d97706', fontSize:10 }}>
              {w.status}
            </span>
          </div>
        ))}
        {myWorks.length === 0 && <div className="empty">{t('noWorksAdded')}</div>}
      </Card>
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// MY WORKS — PENDING + COMPLETED
// ══════════════════════════════════════════════════════════════════
function MyWorks() {
  const { t } = useTranslation();
  const [works, setWorks] = useState(() => store.get('ev_staff_works') || []);
  const [tab, setTab] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', priority:'medium', dueDate:'', notes:'' });

  const save = () => {
    if (!form.title.trim()) return;
    let updated;
    if (editId) {
      updated = works.map(w => w.id === editId ? { ...w, ...form } : w);
    } else {
      updated = [...works, { ...form, id: Date.now().toString(), status:'pending', createdAt: new Date().toISOString() }];
    }
    setWorks(updated); store.set('ev_staff_works', updated);
    setForm({ title:'', description:'', priority:'medium', dueDate:'', notes:'' });
    setShowAdd(false); setEditId(null);
  };

  const markDone = id => {
    const updated = works.map(w => w.id === id ? { ...w, status: w.status === 'completed' ? 'pending' : 'completed', completedAt: new Date().toISOString() } : w);
    setWorks(updated); store.set('ev_staff_works', updated);
  };

  const deleteWork = id => {
    const updated = works.filter(w => w.id !== id);
    setWorks(updated); store.set('ev_staff_works', updated);
  };

  const startEdit = w => {
    setForm({ title: w.title, description: w.description, priority: w.priority, dueDate: w.dueDate || '', notes: w.notes || '' });
    setEditId(w.id); setShowAdd(true);
  };

  const filtered = tab === 'pending' ? works.filter(w => w.status === 'pending')
    : tab === 'completed' ? works.filter(w => w.status === 'completed')
    : works;

  const PRIO_COLOR = { high:'#dc2626', medium:'#d97706', low:'#16a34a' };

  return <>
    <PageHeader title="My Works" sub="Track your pending and completed tasks." />

    <div className="works-tabs">
      {[['all','All',works.length],['pending','Pending',works.filter(w=>w.status==='pending').length],['completed','Completed',works.filter(w=>w.status==='completed').length]].map(([key,label,count]) => (
        <button key={key} className={'works-tab'+(tab===key?' active':'')} onClick={() => setTab(key)}>
          {label} <span className="tab-count">{count}</span>
        </button>
      ))}
    </div>

    {showAdd && editId && (
      <div className="card work-form-card">
        <div className="card-head">
          <div className="card-title">Edit Work</div>
          <button className="icon-btn" onClick={() => { setShowAdd(false); setEditId(null); }}><X size={17} /></button>
        </div>
        <div className="work-form-grid">
          <div className="form-field full">
            <label>Work Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. Replace battery unit on EV-0042" />
          </div>
          <div className="form-field full">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} rows={2} placeholder="What needs to be done…" />
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="form-field">
            <label>Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate:e.target.value})} />
          </div>
          <div className="form-field full">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} rows={2} placeholder="Any additional notes…" />
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <button className="btn-primary" onClick={save}><Save size={14} /> {editId ? 'Update' : 'Save Work'}</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</button>
        </div>
      </div>
    )}

    <div className="works-list">
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No {tab === 'all' ? '' : tab} works</div>
          <div className="empty-sub">{tab === 'all' ? 'Add your first work item to get started.' : `No ${tab} works right now.`}</div>
        </div>
      )}
      {filtered.map(w => (
        <div key={w.id} className={'work-card' + (w.status === 'completed' ? ' done' : '')}>
          <div className="work-card-left">
            <button className={'work-check' + (w.status === 'completed' ? ' checked' : '')} onClick={() => markDone(w.id)}>
              {w.status === 'completed' ? <CheckCircle size={20} /> : <div className="check-circle" />}
            </button>
          </div>
          <div className="work-card-body">
            <div className="work-card-top">
              <span className="work-title">{w.title}</span>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span className="prio-tag" style={{ background: PRIO_COLOR[w.priority]+'18', color: PRIO_COLOR[w.priority] }}>{w.priority}</span>
                {w.dueDate && <span className="due-tag">📅 {new Date(w.dueDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
              </div>
            </div>
            {w.description && <div className="work-desc">{w.description}</div>}
            {w.notes && <div className="work-notes">📝 {w.notes}</div>}
            <div className="work-meta">
              Added {new Date(w.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
              {w.completedAt && ` · Completed ${new Date(w.completedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`}
            </div>
          </div>
          <div className="work-card-actions">
            <button className="icon-btn" onClick={() => startEdit(w)}><Edit2 size={15} /></button>
            <button className="icon-btn danger" onClick={() => deleteWork(w.id)}><X size={15} /></button>
          </div>
        </div>
      ))}
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// HOLIDAYS — REGIONAL & PUBLIC (Dynamic Year)
// ══════════════════════════════════════════════════════════════════
// Year-aware holiday calculation with correct 2026 dates
const HOLIDAY_OVERRIDES = {
  2026: {
    public: [
      { date:'2026-01-26', name:'Republic Day', type:'National', icon:'🇮🇳' },
      { date:'2026-03-03', name:'Holi', type:'National', icon:'🎨' },
      { date:'2026-03-04', name:'Holi (Dhuleti)', type:'National', icon:'🎨' },
      { date:'2026-04-03', name:'Good Friday', type:'National', icon:'✝️' },
      { date:'2026-04-14', name:'Dr. B.R. Ambedkar Jayanti', type:'National', icon:'📚' },
      { date:'2026-05-01', name:'Labour Day', type:'National', icon:'⚒️' },
      { date:'2026-08-15', name:'Independence Day', type:'National', icon:'🇮🇳' },
      { date:'2026-10-02', name:'Gandhi Jayanti', type:'National', icon:'🕊️' },
      { date:'2026-10-20', name:'Dussehra', type:'National', icon:'🏹' },
      { date:'2026-11-08', name:'Diwali (Lakshmi Puja)', type:'National', icon:'🪔' },
      { date:'2026-12-25', name:'Christmas', type:'National', icon:'🎄' },
    ],
    regional: {
      TS: [
        { date:'2026-03-19', name:'Ugadi (Telugu New Year)', icon:'🌸' },
        { date:'2026-04-14', name:'Dr. Ambedkar Jayanti', icon:'📚' },
        { date:'2026-06-02', name:'Telangana Formation Day', icon:'🏛️' },
        { date:'2026-09-14', name:'Ganesh Chaturthi', icon:'🐘' },
        { date:'2026-10-20', name:'Dussehra', icon:'🏹' },
        { date:'2026-11-08', name:'Diwali', icon:'🪔' },
      ],
      TN: [
        { date:'2026-01-14', name:'Pongal', icon:'🌾' },
        { date:'2026-01-15', name:'Thiruvalluvar Day', icon:'📖' },
        { date:'2026-01-16', name:'Uzhavar Thirunal', icon:'🌾' },
        { date:'2026-04-14', name:'Tamil New Year', icon:'🌟' },
        { date:'2026-05-28', name:'Vaikasi Visakam', icon:'🙏' },
      ],
      MH: [
        { date:'2026-05-01', name:'Maharashtra Day', icon:'🏛️' },
        { date:'2026-04-14', name:'Dr. Ambedkar Jayanti', icon:'📚' },
        { date:'2026-09-14', name:'Ganesh Chaturthi', icon:'🐘' },
      ],
      KA: [
        { date:'2026-11-01', name:'Kannada Rajyotsava', icon:'🟡' },
        { date:'2026-10-20', name:'Dussehra (Mysuru)', icon:'👑' },
      ],
      AP: [
        { date:'2026-03-19', name:'Telugu New Year (Ugadi)', icon:'🌸' },
        { date:'2026-09-14', name:'Ganesh Chaturthi', icon:'🐘' },
        { date:'2026-12-20', name:'Vaikunta Ekadasi', icon:'🙏' },
      ],
      KL: [
        { date:'2026-08-26', name:'Onam (Thiruvonam)', icon:'🌺' },
        { date:'2026-08-16', name:'Atham (Onam Start)', icon:'🌺' },
      ],
    }
  }
};

function getHolidaysForYear(yr) {
  if (HOLIDAY_OVERRIDES[yr]) return HOLIDAY_OVERRIDES[yr];
  const y = yr.toString();
  return {
    public: [
      { date:`${y}-01-26`, name:'Republic Day', type:'National', icon:'🇮🇳' },
      { date:`${y}-03-14`, name:'Holi', type:'National', icon:'🎨' },
      { date:`${y}-04-14`, name:'Dr. B.R. Ambedkar Jayanti', type:'National', icon:'📚' },
      { date:`${y}-04-18`, name:'Good Friday', type:'National', icon:'✝️' },
      { date:`${y}-05-01`, name:'Labour Day', type:'National', icon:'⚒️' },
      { date:`${y}-08-15`, name:'Independence Day', type:'National', icon:'🇮🇳' },
      { date:`${y}-10-02`, name:'Gandhi Jayanti', type:'National', icon:'🕊️' },
      { date:`${y}-10-20`, name:'Dussehra', type:'National', icon:'🏹' },
      { date:`${y}-11-05`, name:'Diwali', type:'National', icon:'🪔' },
      { date:`${y}-12-25`, name:'Christmas', type:'National', icon:'🎄' },
    ],
    regional: {
      TS: [
        { date:`${y}-04-06`, name:'Ugadi (Telugu New Year)', icon:'🌸' },
        { date:`${y}-04-14`, name:'Dr. Ambedkar Jayanti', icon:'📚' },
        { date:`${y}-06-02`, name:'Telangana Formation Day', icon:'🏛️' },
        { date:`${y}-08-27`, name:'Ganesh Chaturthi', icon:'🐘' },
        { date:`${y}-10-20`, name:'Dussehra', icon:'🏹' },
        { date:`${y}-11-05`, name:'Diwali', icon:'🪔' },
      ],
      TN: [
        { date:`${y}-01-14`, name:'Pongal', icon:'🌾' },
        { date:`${y}-01-15`, name:'Thiruvalluvar Day', icon:'📖' },
        { date:`${y}-01-16`, name:'Uzhavar Thirunal', icon:'🌾' },
        { date:`${y}-04-14`, name:'Tamil New Year', icon:'🌟' },
        { date:`${y}-06-08`, name:'Vaikasi Visakam', icon:'🙏' },
      ],
      MH: [
        { date:`${y}-02-26`, name:'Maharashtra Day', icon:'🏛️' },
        { date:`${y}-04-14`, name:'Dr. Ambedkar Jayanti', icon:'📚' },
        { date:`${y}-08-27`, name:'Ganesh Chaturthi', icon:'🐘' },
      ],
      KA: [
        { date:`${y}-11-01`, name:'Kannada Rajyotsava', icon:'🟡' },
        { date:`${y}-10-20`, name:'Dussehra (Mysuru)', icon:'👑' },
      ],
      AP: [
        { date:`${y}-03-30`, name:'Telugu New Year (Ugadi)', icon:'🌸' },
        { date:`${y}-05-16`, name:'Vaikunta Ekadasi', icon:'🙏' },
      ],
      KL: [
        { date:`${y}-08-15`, name:'Onam', icon:'🌺' },
        { date:`${y}-09-01`, name:'Thiruvonam', icon:'🌺' },
      ],
    }
  };
}

// Telangana first
const REGION_NAMES = { TS:'Telangana', TN:'Tamil Nadu', MH:'Maharashtra', KA:'Karnataka', AP:'Andhra Pradesh', KL:'Kerala' };

function Holidays() {
  const { t } = useTranslation();
  const [region, setRegion] = useState('TS');
  const [filterMonth, setFilterMonth] = useState('');
  const today = new Date();
  const currentYear = today.getFullYear();
  const HOLIDAYS = getHolidaysForYear(currentYear);

  const allHolidays = [
    ...HOLIDAYS.public.map(h => ({ ...h, category:'public' })),
    ...(HOLIDAYS.regional[region] || []).map(h => ({ ...h, type:'Regional', category:'regional' })),
  ].sort((a,b) => a.date.localeCompare(b.date));

  const filtered = filterMonth
    ? allHolidays.filter(h => h.date.startsWith(`${currentYear}-${filterMonth}`))
    : allHolidays;

  const upcoming = allHolidays.filter(h => new Date(h.date) >= today).slice(0,3);
  const nextHoliday = upcoming[0];

  const daysUntil = d => {
    const diff = new Date(d) - today;
    return Math.ceil(diff / (1000*60*60*24));
  };

  return <>
    <PageHeader title={`${t('holidaysTitle')} ${currentYear}`} sub={t('publicRegionalHolidays')} />

    {nextHoliday && (
      <div className="next-holiday-banner">
        <div className="nhb-icon">{nextHoliday.icon}</div>
        <div>
          <div className="nhb-label">{t('nextHoliday')}</div>
          <div className="nhb-name">{nextHoliday.name}</div>
          <div className="nhb-date">{new Date(nextHoliday.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} · in {daysUntil(nextHoliday.date)} day{daysUntil(nextHoliday.date)!==1?'s':''}</div>
        </div>
        <div className="nhb-count">{daysUntil(nextHoliday.date)}<span>{t('days')}</span></div>
      </div>
    )}

    <div className="holiday-controls">
      <div className="region-tabs">
        {Object.entries(REGION_NAMES).map(([code,name]) => (
          <button key={code} className={'region-tab'+(region===code?' active':'')} onClick={() => setRegion(code)}>
            {name}
          </button>
        ))}
      </div>
      <select className="month-filter" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
        <option value="">{t('allMonths')}</option>
        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
          <option key={m} value={m}>{new Date(currentYear,+m-1,1).toLocaleString('en-IN',{month:'long'})}</option>
        ))}
      </select>
    </div>

    <div className="holidays-grid">
      {filtered.map((h,i) => {
        const past = new Date(h.date) < today;
        const isToday = h.date === today.toISOString().slice(0,10);
        return (
          <div key={i} className={'holiday-card'+(past?' past':'')+(isToday?' today':'')}>
            <div className="hc-icon">{h.icon}</div>
            <div className="hc-body">
              <div className="hc-name">{h.name}</div>
              <div className="hc-date">{new Date(h.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
              <span className={'hc-type'+(h.category==='regional'?' regional':'')}>{h.type || 'Regional'}</span>
              {isToday && <span className="today-tag">Today!</span>}
              {!past && !isToday && <span className="hc-days-left">{daysUntil(h.date)}d</span>}
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <div className="empty">No holidays in selected month.</div>}
    </div>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// LEAVE MANAGEMENT
// ══════════════════════════════════════════════════════════════════
function Leave({ user }) {
  const [leaves, setLeaves] = useState(() => store.get('ev_staff_leaves') || []);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('history');
  const [form, setForm] = useState({
    type: 'casual', fromDate:'', toDate:'', reason:'', contactDuring:'', emergencyContact:''
  });
  const [submitted, setSubmitted] = useState(false);

  const LEAVE_TYPES = ['casual','sick','earned','maternity','paternity','unpaid','compensatory'];
  const typeColors = { casual:'#2563eb', sick:'#dc2626', earned:'#16a34a', maternity:'#7c3aed', paternity:'#7c3aed', unpaid:'#6b7280', compensatory:'#d97706' };

  const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const diff = new Date(to) - new Date(from);
    return Math.max(0, Math.ceil(diff / (1000*60*60*24)) + 1);
  };

  const submitLeave = () => {
    if (!form.fromDate || !form.toDate || !form.reason) return;
    const newLeave = {
      ...form,
      id: Date.now().toString(),
      days: calcDays(form.fromDate, form.toDate),
      status: 'PENDING',
      appliedOn: new Date().toISOString(),
      staffName: user?.name || 'Staff',
      staffEmail: user?.email || '',
      staffId: user?._id || user?.id || 'staff-001',
      franchiseeRef: user?.hubId || 'HUB-001',
    };
    // Save to staff personal history
    const updated = [newLeave, ...leaves];
    setLeaves(updated); store.set('ev_staff_leaves', updated);

    // Also push to shared franchise leave requests (visible to franchisee for approval)
    const franLeaves = store.get('ev_franchise_leave_requests') || [];
    franLeaves.unshift({ ...newLeave });
    store.set('ev_franchise_leave_requests', franLeaves);

    setForm({ type:'casual', fromDate:'', toDate:'', reason:'', contactDuring:'', emergencyContact:'' });
    setSubmitted(true); setShowForm(false); setTab('history');
    setTimeout(() => setSubmitted(false), 4000);
  };

  // Sync approval status back from franchisee store
  useEffect(() => {
    const franLeaves = store.get('ev_franchise_leave_requests') || [];
    const staffId = user?._id || user?.id;
    if (!staffId) return;
    const myFranLeaves = franLeaves.filter(l => l.staffId === staffId);
    if (!myFranLeaves.length) return;
    // Update local leaves with any status changes from franchisee
    setLeaves(prev => prev.map(l => {
      const match = myFranLeaves.find(fl => fl.id === l.id);
      return match && match.status !== l.status ? { ...l, status: match.status } : l;
    }));
  }, []);

  const cancelLeave = id => {
    const updated = leaves.map(l => l.id === id && l.status === 'PENDING' ? { ...l, status:'CANCELLED' } : l);
    setLeaves(updated); store.set('ev_staff_leaves', updated);
  };

  const pending  = leaves.filter(l => l.status === 'PENDING').length;
  const approved = leaves.filter(l => l.status === 'APPROVED').length;
  const taken    = leaves.filter(l => l.status === 'APPROVED').reduce((s,l) => s + (l.days||0), 0);

  return <>
    <PageHeader title="Leave Management" sub="Apply for leave and track approvals." />

    {submitted && (
      <div className="success-toast">
        ✅ Leave application submitted! Your franchisee will review and approve.
      </div>
    )}

    <MetricGrid metrics={[
      { label:'Pending Approval', value:pending,  Icon:Clock,        color:'#d97706' },
      { label:'Approved Leaves',  value:approved, Icon:CheckCircle,  color:'#16a34a' },
      { label:'Days Taken',       value:taken,    Icon:Calendar,     color:'#2563eb' },
      { label:'Total Applied',    value:leaves.length, Icon:FileText, color:'#7c3aed' },
    ]} />

    <div className="leave-top-bar">
      <div className="works-tabs" style={{ flex:1 }}>
        <button className={'works-tab'+(tab==='history'?' active':'')} onClick={() => setTab('history')}>Leave History</button>
        <button className={'works-tab'+(tab==='balance'?' active':'')} onClick={() => setTab('balance')}>Balance</button>
      </div>
      <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
        {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Apply for Leave</>}
      </button>
    </div>

    {showForm && (
      <div className="card leave-form-card">
        <div className="card-title" style={{ marginBottom:16 }}>Leave Application</div>
        <div className="work-form-grid">
          <div className="form-field">
            <label>Leave Type</label>
            <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)} Leave</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Duration {form.fromDate && form.toDate && <span style={{color:'#2563eb',fontWeight:700}}>({calcDays(form.fromDate,form.toDate)} day{calcDays(form.fromDate,form.toDate)!==1?'s':''})</span>}</label>
            <div style={{ display:'flex', gap:8 }}>
              <input type="date" value={form.fromDate} onChange={e => setForm({...form,fromDate:e.target.value})} style={{ flex:1 }} />
              <input type="date" value={form.toDate} min={form.fromDate} onChange={e => setForm({...form,toDate:e.target.value})} style={{ flex:1 }} />
            </div>
          </div>
          <div className="form-field full">
            <label>Reason *</label>
            <textarea value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} rows={3} placeholder="Explain the reason for your leave…" />
          </div>
          <div className="form-field">
            <label>Contact During Leave</label>
            <input value={form.contactDuring} onChange={e => setForm({...form,contactDuring:e.target.value})} placeholder="Phone number" />
          </div>
          <div className="form-field">
            <label>Emergency Contact</label>
            <input value={form.emergencyContact} onChange={e => setForm({...form,emergencyContact:e.target.value})} placeholder="Name & number" />
          </div>

          <div className="form-field full">
            <div className="approval-note">
              <Shield size={14} /> This application will be sent to <strong>{user?.hubId ? `Franchisee (Hub: ${user.hubId})` : 'your Franchisee'}</strong> for approval.
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <button className="btn-primary" onClick={submitLeave} disabled={!form.fromDate || !form.toDate || !form.reason}>
            <Save size={14}/> Submit Application
          </button>
          <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      </div>
    )}

    {tab === 'history' && (
      <div className="leaves-list">
        {leaves.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">No leave history</div>
            <div className="empty-sub">Apply for leave to see history here.</div>
          </div>
        )}
        {leaves.map(l => (
          <div key={l.id} className="leave-card">
            <div className="leave-card-left">
              <div className="leave-type-badge" style={{ background: (typeColors[l.type]||'#6b7280')+'18', color: typeColors[l.type]||'#6b7280' }}>
                {l.type?.toUpperCase()} LEAVE
              </div>
              <div className="leave-dates">
                {new Date(l.fromDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                {' — '}
                {new Date(l.toDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
              </div>
              <div className="leave-days">{l.days} day{l.days!==1?'s':''}</div>
            </div>
            <div className="leave-card-body">
              <div className="leave-reason">{l.reason}</div>
              {l.contactDuring && <div className="leave-contact">📞 {l.contactDuring}</div>}
              <div className="leave-meta">Applied {new Date(l.appliedOn).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
            </div>
            <div className="leave-card-right">
              <span className="status-pill" style={{ background:(STATUS_COLOR[l.status]||'#6b7280')+'18', color:STATUS_COLOR[l.status]||'#6b7280', fontSize:11 }}>
                {l.status}
              </span>
              {l.status === 'PENDING' && (
                <button className="btn-danger-sm" onClick={() => cancelLeave(l.id)}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}

    {tab === 'balance' && (
      <div className="balance-grid">
        {[
          { type:'Casual Leave', total:12, used: leaves.filter(l=>l.type==='casual'&&l.status==='APPROVED').reduce((s,l)=>s+l.days,0), color:'#2563eb' },
          { type:'Sick Leave', total:10, used: leaves.filter(l=>l.type==='sick'&&l.status==='APPROVED').reduce((s,l)=>s+l.days,0), color:'#dc2626' },
          { type:'Earned Leave', total:15, used: leaves.filter(l=>l.type==='earned'&&l.status==='APPROVED').reduce((s,l)=>s+l.days,0), color:'#16a34a' },
          { type:'Compensatory', total:5, used: leaves.filter(l=>l.type==='compensatory'&&l.status==='APPROVED').reduce((s,l)=>s+l.days,0), color:'#d97706' },
        ].map(b => (
          <div key={b.type} className="balance-card">
            <div className="bc-top">
              <div className="bc-type">{b.type}</div>
              <div className="bc-remain" style={{ color:b.color }}>{b.total-b.used}</div>
            </div>
            <div className="bc-bar">
              <div className="bc-bar-fill" style={{ width:`${Math.min(100,(b.used/b.total)*100)}%`, background:b.color }} />
            </div>
            <div className="bc-meta">{b.used} used of {b.total} days</div>
          </div>
        ))}
      </div>
    )}
  </>;
}

// ══════════════════════════════════════════════════════════════════
// PROFILE — PHOTO, DETAILS, AADHAAR, PAN, ADDRESS, SETTINGS
// ══════════════════════════════════════════════════════════════════
function Profile({ user, setUser }) {
  const { setLang } = useContext(LangContext);
  const [profile, setProfile] = useState(() => store.get('ev_staff_profile') || {
    name: user?.name || '', email: user?.email || '', phone:'', dob:'', gender:'',
    aadhaar:'', pan:'', address:'', city:'', state:'', pincode:'',
    profilePic: null,
    settings: { notifications:true, darkMode:false, language:'en', fontSize:'medium' }
  });
  const [activeTab, setActiveTab] = useState('personal');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const save = () => {
    store.set('ev_staff_profile', profile);
    if (setUser) setUser(u => ({ ...u, name: profile.name, profilePic: profile.profilePic }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const updated = { ...profile, profilePic: ev.target.result };
      setProfile(updated); store.set('ev_staff_profile', updated);
      if (setUser) setUser(u => ({ ...u, profilePic: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const upd = (k, v) => setProfile(p => ({ ...p, [k]:v }));
  const updSettings = (k, v) => setProfile(p => ({ ...p, settings: { ...p.settings, [k]:v } }));

  const TAB_LABELS = [
    ['personal', 'Personal', User],
    ['documents', 'Documents', CreditCard],
    ['address', 'Address', Home],
    ['settings', 'Settings', Settings],
  ];

  const FieldVal = ({ value }) => value
    ? <div className="profile-field-val">{value}</div>
    : <div className="profile-field-val"><span style={{ color:'#d1d5db' }}>Not set</span></div>;

  return <>
    <PageHeader title="My Profile" sub="Manage your personal details and preferences." />

    {saved && <div className="success-toast">✅ Profile saved successfully!</div>}

    <div className="profile-layout">
      {/* Profile Photo Card */}
      <div className="profile-photo-card">
        <div className="profile-avatar-wrap">
          {profile.profilePic
            ? <img src={profile.profilePic} alt="Profile" className="profile-avatar-img" />
            : <div className="profile-avatar-default">{(profile.name || user?.name || '?')[0]}</div>
          }
          <button className="photo-upload-btn" onClick={() => fileRef.current?.click()}>
            <Camera size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
        </div>
        <div className="profile-name-block">
          <div className="profile-display-name">{profile.name || user?.name || 'Staff'}</div>
          <div className="profile-role-badge">{user?.role || 'STAFF'}</div>
          {user?.hubId && <div className="profile-hub">Hub: {user.hubId}</div>}
        </div>
        <div className="profile-quick-stats">
          <div className="pqs-item">
            <div className="pqs-val">{(store.get('ev_staff_works')||[]).length}</div>
            <div className="pqs-label">Works</div>
          </div>
          <div className="pqs-item">
            <div className="pqs-val">{(store.get('ev_staff_leaves')||[]).length}</div>
            <div className="pqs-label">Leaves</div>
          </div>
          <div className="pqs-item">
            <div className="pqs-val">{(store.get('ev_staff_works')||[]).filter(w=>w.status==='completed').length}</div>
            <div className="pqs-label">Done</div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="profile-details">
        <div className="profile-tabs">
          {TAB_LABELS.map(([id, label, Icon]) => (
            <button key={id} className={'prof-tab'+(activeTab===id?' active':'')} onClick={() => setActiveTab(id)}>
              <Icon size={14}/> {label}
            </button>
          ))}
        </div>

        {activeTab === 'personal' && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Personal Information</div>
            </div>
            <div className="work-form-grid">
              {[
                ['name','Full Name'], ['email','Email'], ['phone','Phone Number'],
                ['dob','Date of Birth'], ['gender','Gender'],
              ].map(([key, label]) => (
                <div key={key} className="form-field">
                  <label>{label}</label>
                  <FieldVal value={profile[key]} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Identity Documents</div>
            </div>
            <div className="doc-fields">
              {[
                { key:'aadhaar', label:'Aadhaar Number', icon:'🪪', mask: v => v ? v.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '' },
                { key:'pan', label:'PAN Card', icon:'💳', mask: v => v },
              ].map(({ key, label, icon, mask }) => (
                <div key={key} className="doc-field-card">
                  <div className="dfc-icon">{icon}</div>
                  <div className="dfc-body">
                    <div className="dfc-label">{label}</div>
                    <div className="dfc-val">{profile[key] ? mask(profile[key]) : <span style={{ color:'#d1d5db' }}>Not added</span>}</div>
                  </div>
                  {profile[key] && <span className="dfc-verified">✓</span>}
                </div>
              ))}
            </div>
            <div className="doc-privacy-note">🔒 Your documents are stored locally and never shared without consent.</div>
          </div>
        )}

        {activeTab === 'address' && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Address</div>
            </div>
            <div className="work-form-grid">
              <div className="form-field full">
                <label>Street Address</label>
                <FieldVal value={profile.address} />
              </div>
              {[['city','City'],['state','State'],['pincode','PIN Code']].map(([k,l]) => (
                <div key={k} className="form-field">
                  <label>{l}</label>
                  <FieldVal value={profile[k]} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <div className="card-title" style={{ marginBottom:20 }}>App Settings</div>
            <div className="settings-list">
              <div className="setting-row">
                <div>
                  <div className="setting-label">Push Notifications</div>
                  <div className="setting-sub">Get alerts for job updates and leave status</div>
                </div>
                <button className={'toggle-btn'+(profile.settings.notifications?' on':'')} onClick={() => { updSettings('notifications', !profile.settings.notifications); save(); }}>
                  <div className="toggle-knob" />
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <div className="setting-label">Language</div>
                  <div className="setting-sub">Interface language</div>
                </div>
                <select value={profile.settings.language} className="settings-select"
                  onChange={e => { updSettings('language', e.target.value); if(setLang) setLang(e.target.value); save(); }}>
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <div className="setting-label">Font Size</div>
                  <div className="setting-sub">Adjust text size for readability</div>
                </div>
                <select value={profile.settings.fontSize} className="settings-select"
                  onChange={e => { updSettings('fontSize', e.target.value); save(); }}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </>;
}