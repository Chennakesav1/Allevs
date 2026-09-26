import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import allevLogo from '../allevlogo.png';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Activity, AlertTriangle, Car, CheckCircle, ClipboardList,
  DollarSign, Factory, Gauge, LayoutDashboard, LogOut, MapPin,
  Package, Users, Zap, Truck, Shield, TrendingUp, Wallet, Bell, FileText,
  Calendar, Clock, User, Camera, CreditCard, Home, Settings,
  ChevronLeft, ChevronRight, Upload, Edit2, Save, X, Plus,
  Sun, Star, Coffee, Award, Briefcase, Heart, BookOpen, Menu,
  MessageSquare, Megaphone, Search, Moon, Globe2, ShieldCheck,
  ClipboardCheck, Navigation, Smartphone, Download, Send, Check,
  ChevronDown, UserCheck, Timer, Wifi, BadgeCheck, CircleDollarSign
} from 'lucide-react';
import './staff.css';

const API = import.meta.env.VITE_API_URL || '/api';
const kind = 'staff';
const ALLOWED_ROLES = ['TECHNICIAN','STAFF','HUB_MANAGER','CENTRAL_ADMIN','SUPER_ADMIN'];

// Holiday overrides are optional. Keep the fallback calendar active when no custom overrides are configured.
const HOLIDAY_OVERRIDES = {};

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
    pendingLeaves:'pending leave', pendingWork:'pending work', chargeHubs:'Charge Hubs',
    applyForLeave:'Apply for Leave', leaveHistory:'Leave History', balance:'Balance',
    pushNotifications:'Push Notifications', language:'Language', fontSize:'Font Size',
    getAlerts:'Get alerts for job updates and leave status', interfaceLanguage:'Interface language',
    adjustTextSize:'Adjust text size for readability', small:'Small', big:'Large',
    fullName:'Full Name', email:'Email', phoneNumber:'Phone Number', dateOfBirth:'Date of Birth', gender:'Gender',
    identityDocuments:'Identity Documents', streetAddress:'Street Address', city:'City', state:'State', pinCode:'PIN Code',
    appSettings:'App Settings', profileSaved:'Profile saved successfully!',
    submitApplication:'Submit Application', leavePendingApproval:'Pending Approval',
    approvedLeaves:'Approved Leaves', daysTaken:'Days Taken', totalApplied:'Total Applied',
    notifications:'Notifications', attendance:'Attendance & Duty', support:'Support', documentsVault:'Documents', payslips:'Payslips', performance:'Performance', shifts:'Shift Schedule', recognition:'Recognition', checklist:'Daily Checklist', search:'Search', announcements:'Announcements', security:'Security',
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
        <img src={allevLogo} alt="allEV" style={{height:"44px",objectFit:"contain"}} />
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
  const { data: sidebarNotifications } = useStaffLive(call, '/staff/notifications', 15000);
  const [badgeSeenAt, setBadgeSeenAt] = useState(0);
  const unreadSidebar = (sidebarNotifications||[]).filter(n=>!n.read && new Date(n.createdAt||0).getTime() > badgeSeenAt).length;
  const navigate = (id) => {
    if (id === 'notifications') {
      setBadgeSeenAt(Date.now());
      call('/staff/notifications/read-all',{method:'put'}).catch(()=>{});
    }
    setPage(id);
  };

  const NAV_ITEMS = [
    { id: 'dashboard', labelKey: 'dashboard', Icon: LayoutDashboard },
    { id: 'my-works', labelKey: 'myWorks', Icon: Briefcase },
    { id: 'notifications', labelKey: 'notifications', Icon: Bell },
    { id: 'attendance', labelKey: 'attendance', Icon: Clock },
    { id: 'checklist', labelKey: 'checklist', Icon: ClipboardCheck },
    { id: 'leave', labelKey: 'leave', Icon: Calendar },
    { id: 'shifts', labelKey: 'shifts', Icon: Calendar },
    { id: 'payslips', labelKey: 'payslips', Icon: CircleDollarSign },
    { id: 'documents', labelKey: 'documentsVault', Icon: FileText },
    { id: 'support', labelKey: 'support', Icon: MessageSquare },
    { id: 'performance', labelKey: 'performance', Icon: TrendingUp },
    { id: 'recognition', labelKey: 'recognition', Icon: Award },
    { id: 'global-search', labelKey: 'search', Icon: Search },
    { id: 'security', labelKey: 'security', Icon: ShieldCheck },
    { id: 'charge-hubs', labelKey: 'chargeHubs', Icon: MapPin },
    { id: 'profile', labelKey: 'profile', Icon: User },
  ];

  return (
    <div className="shell-sidebar-layout">
      {/* ── Vertical Sidebar ── */}
      <aside className={'sidebar' + (sidebarCollapsed ? ' collapsed' : '')}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={allevLogo} alt="allEV" style={{height:"30px",objectFit:"contain"}} />
          </div>
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle sidebar">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!user ? (
            !sidebarCollapsed ? <SidebarSkeleton count={NAV_ITEMS.length} /> : null
          ) : NAV_ITEMS.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              className={'sidebar-nav-item' + (page === id ? ' active' : '')}
              onClick={() => navigate(id)}
              title={sidebarCollapsed ? t(labelKey) : ''}
            >
              <Icon size={18} />
              {!sidebarCollapsed && <span>{t(labelKey)}</span>}
              {id==='notifications' && unreadSidebar>0 && <b className="nav-count-badge">{unreadSidebar>99?'99+':unreadSidebar}</b>}
              
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
        <div className="topnav-logo"><img src={allevLogo} alt="allEV" style={{height:'30px',objectFit:'contain'}} /></div>
        <button className="mobile-profile-btn" onClick={() => setPage('profile')} aria-label="Profile">
          {user?.profileImage || user?.profilePic ? <img src={user.profileImage || user.profilePic} alt="" className="mobile-profile-avatar-img" /> : <span className="mobile-profile-avatar">{user?.name?.[0] || '?'}</span>}
          <span className="mobile-profile-online" />
        </button>
      </header>

      {/* ── Page Content ── */}
      <div className="page-content-area">
        <PageRouter page={page} call={call} user={user} setUser={setUser} setPage={setPage} />
        <nav className="staff-mobile-bottom-nav">
          {[['dashboard','Dashboard',LayoutDashboard],['my-works','My Works',Briefcase],['holidays','Holidays',Calendar],['notifications','Notifications',Bell],['profile','Profile',User]].map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={21}/><span>{label}</span>{id==='notifications'&&<b className="bottom-badge">{(store.get('ev_staff_notifications')||[]).filter(n=>!n.read).length||''}</b>}</button>)}
        </nav>
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
    'my-works': <MyWorks user={user} {...P} />,
    holidays: <Holidays {...P} />,
    leave: <Leave {...P} />,
    profile: <Profile {...P} />,
    'charge-hubs': <StaffChargeHubs {...P} />,
    notifications: <NotificationsCenter {...P} />,
    attendance: <AttendanceDuty {...P} />,
    checklist: <DailyChecklist {...P} />,
    documents: <DocumentsVault {...P} />,
    payslips: <Payslips {...P} />,
    support: <SupportTickets {...P} />,
    performance: <StaffPerformance {...P} />,
    shifts: <ShiftSchedule {...P} />,
    recognition: <StaffRecognition {...P} />,
    'global-search': <GlobalSearch {...P} />,
    security: <SecurityPage {...P} />,
  };
  return pages[page] || pages.dashboard;
}

// ══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════
function PageHeader({ title, sub, back }) {
  return (
    <div className="page-header">
      {back && <button className="mobile-back-btn" onClick={back}><ChevronLeft size={20}/></button>}
      <h1 className="page-title">{title}</h1>
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

// Sidebar skeleton — shown while nav / user is loading
function SidebarSkeleton({ count = 5 }) {
  return (
    <div className="sidebar-skeleton-nav">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sidebar-skel-item">
          <div className="sidebar-skel-icon" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="sidebar-skel-label" style={{ animationDelay: `${i * 60 + 30}ms` }} />
        </div>
      ))}
    </div>
  );
}

function Loader() {
  return (
    <div className="page-center-loader">
      <div className="ev-loading-screen">
        <div className="ev-logo-aura-wrap">
          <div className="ev-logo-aura ev-logo-aura-1" />
          <div className="ev-logo-aura ev-logo-aura-2" />
          <div className="ev-logo-aura ev-logo-aura-3" />
          <div className="ev-logo-card">
            <img src={allevLogo} alt="allEV" className="ev-logo-img" />
            <div className="ev-logo-shimmer-sweep" />
          </div>
        </div>
        <div className="ev-loading-title">Loading EV Data…</div>
        <div className="ev-loading-sub">Fetching latest information</div>
        <div className="ev-progress-bar">
          <div className="ev-progress-fill" />
        </div>
        <div className="ev-dots">
          <div className="ev-dot" /><div className="ev-dot" /><div className="ev-dot" />
        </div>
      </div>
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
  const { data: leaveRows } = useFetch(call, '/staff/leave-requests');
  const { data: notificationRows } = useFetch(call, '/staff/notifications');
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
  const liveLeaves = leaveRows || leaves;
  const pendingLeaves = liveLeaves.filter(l => l.status === 'PENDING').length;
  const pendingWorks  = myWorks.filter(w => w.status === 'pending').length;
  const completedWorks = myWorks.filter(w => w.status === 'completed').length;
  const unreadNotificationsCount = (notificationRows || store.get('ev_staff_notifications') || []).filter(n => !n.read).length;

  const today = new Date();
  const weekday = today.toLocaleDateString('en-IN', { weekday:'long' });
  const dateStr = today.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  // ── Duty helpers ──
  const requestDutyToggle = () => {
    setConfirmAction(dutyOn ? 'off' : 'on');
    setShowDutyConfirm(true);
  };

  const confirmDuty = async () => {
    const now = new Date().toISOString();
    const staffName  = user?.name  || 'Staff';
    const staffId    = user?._id   || user?.id || 'staff-001';
    const staffEmail = user?.email || store.get('ev_staff_profile')?.email || '—';
    const staffPhone = store.get('ev_staff_profile')?.phone || '—';
    const hubId      = user?.hubId || 'HUB-001';
    const todayKey   = new Date().toISOString().slice(0, 10);

    try {
      const endpoint = confirmAction === 'on' ? '/staff/attendance/clock-in' : '/staff/attendance/clock-out';
      const location = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          p => resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
          () => resolve(null),
          {enableHighAccuracy:true,timeout:7000}
        );
      });
      await call(endpoint, { method:'post', data: location ? {location} : {} });
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Could not update duty status');
      setShowDutyConfirm(false);
      return;
    }

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

    <div className="staff-mobile-launcher">
      {[
        ['dashboard','Dashboard',LayoutDashboard,'blue'],['my-works','My Works',Briefcase,'indigo',pendingWorks],['holidays','Holidays',Calendar,'green'],
        ['leave','Leave',Clock,'orange',pendingLeaves],['profile','Profile',User,'pink'],['charge-hubs','Charge Hubs',MapPin,'teal'],
        ['support','Support',MessageSquare,'violet'],['notifications','Notifications',Bell,'sky',unreadNotificationsCount],['payslips','Payslips',CircleDollarSign,'amber'],
        ['documents','Documents',FileText,'purple'],['attendance','Attendance',Timer,'mint'],['checklist','Checklist',ClipboardCheck,'rose'],['global-search','Search',Search,'blue'],['security','Security',ShieldCheck,'indigo']
      ].map(([id,label,Icon,tone,badge]) => (
        <button key={id} className={'staff-mobile-launch-item'+(id==='dashboard'?' active':'')} onClick={()=>setPage(id)}>
          <span className={'staff-mobile-launch-icon '+tone}><Icon size={22}/>{Number(badge)>0 && <b>{badge>9?'9+':badge}</b>}</span>
          <span>{label}</span>
        </button>
      ))}
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

    <div className="dashboard-premium-grid">
      <section className="dashboard-section premium-panel active-jobs-panel">
        <div className="dashboard-section-head">
          <div>
            <div className="dashboard-section-title"><span className="section-icon live-icon"><Activity size={16}/></span>{t('activeJobs')} <span className="live-badge"><i/> {t('live')}</span></div>
            <div className="dashboard-section-sub">Assigned work that still needs attention</div>
          </div>
          <button className="section-link" onClick={() => setPage && setPage('my-works')}>View all <ChevronRight size={16}/></button>
        </div>
        {open?.length ? (
          <div className="active-job-list">
            {open.slice(0,4).map((job, i) => {
              const priority = String(job.priority || 'NORMAL').toUpperCase();
              const status = String(job.status || 'ASSIGNED').replaceAll('_',' ');
              const title = job.title || job.serviceType || 'Service Job';
              const jobId = job.jobId || job._id || `JOB-${i+1}`;
              const pClass = priority === 'HIGH' || priority === 'URGENT' ? 'high' : priority === 'MEDIUM' ? 'medium' : 'normal';
              return (
                <button key={job._id || job.id || i} className="active-job-row" onClick={() => setPage && setPage('my-works')}>
                  <span className={`job-priority-bar ${pClass}`}/>
                  <span className="job-row-icon"><Briefcase size={17}/></span>
                  <span className="job-row-main">
                    <strong>{title}</strong>
                    <small>{jobId} · {job.customerName || job.customer?.name || 'Customer job'}</small>
                  </span>
                  <span className="job-row-side">
                    <em className={`job-status ${String(job.status||'assigned').toLowerCase()}`}>{status}</em>
                    <small className={`job-priority ${pClass}`}>{priority}</small>
                  </span>
                  <ChevronRight size={16} className="job-row-chevron"/>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-empty compact-empty"><span><Briefcase size={22}/></span><strong>No active jobs</strong><small>New assignments will appear here.</small></div>
        )}
      </section>

      <section className="dashboard-section premium-panel works-summary-panel">
        <div className="dashboard-section-head">
          <div>
            <div className="dashboard-section-title"><span className="section-icon works-icon"><ClipboardCheck size={16}/></span>{t('myWorksSummary')}</div>
            <div className="dashboard-section-sub">Your work progress at a glance</div>
          </div>
          <button className="section-link" onClick={() => setPage && setPage('my-works')}>View all <ChevronRight size={16}/></button>
        </div>
        <div className="works-premium-stats">
          <button className="work-stat-card pending" onClick={() => setPage && setPage('my-works')}><span className="work-stat-icon"><Clock size={16}/></span><strong>{pendingWorks}</strong><small>Pending</small></button>
          <button className="work-stat-card progress" onClick={() => setPage && setPage('my-works')}><span className="work-stat-icon"><Zap size={16}/></span><strong>{myWorks.filter(w => ['in-progress','in_progress','started','active'].includes(String(w.status).toLowerCase())).length}</strong><small>In progress</small></button>
          <button className="work-stat-card completed" onClick={() => setPage && setPage('my-works')}><span className="work-stat-icon"><CheckCircle size={16}/></span><strong>{completedWorks}</strong><small>Completed</small></button>
          <button className="work-stat-card total" onClick={() => setPage && setPage('my-works')}><span className="work-stat-icon"><ClipboardList size={16}/></span><strong>{myWorks.length}</strong><small>Total</small></button>
        </div>
        <div className="works-progress-head"><span>Overall progress</span><b>{myWorks.length ? Math.round((completedWorks / myWorks.length) * 100) : 0}%</b></div>
        <div className="works-progress-track"><span style={{width:`${myWorks.length ? Math.round((completedWorks / myWorks.length) * 100) : 0}%`}}/></div>
        {myWorks.length ? (
          <div className="recent-work-list">
            {myWorks.slice(0,3).map(w => (
              <button key={w.id || w._id} className="recent-work-row" onClick={() => setPage && setPage('my-works')}>
                <span className="recent-work-dot"/>
                <span><strong>{w.title || 'Work item'}</strong><small>{w.dueDate ? `Due ${w.dueDate}` : 'Personal task'}</small></span>
                <em className={`mini-work-status ${String(w.status||'pending').toLowerCase()}`}>{w.status || 'pending'}</em>
              </button>
            ))}
          </div>
        ) : <div className="dashboard-empty compact-empty"><span><ClipboardList size={22}/></span><strong>{t('noWorksAdded')}</strong><small>Add or receive work to start tracking progress.</small></div>}
      </section>
    </div>
  </>;
}


function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({x:0,y:0});
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    if (value) { const img = new Image(); img.onload=()=>ctx.drawImage(img,0,0,c.width,c.height); img.src=value; }
    ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#0f172a';
  }, [value]);
  const pos = e => { const c=canvasRef.current; const r=c.getBoundingClientRect(); const src=e.touches?.[0]||e; return {x:(src.clientX-r.left)*(c.width/r.width),y:(src.clientY-r.top)*(c.height/r.height)}; };
  const start=e=>{e.preventDefault();drawing.current=true;last.current=pos(e);};
  const move=e=>{if(!drawing.current)return;e.preventDefault();const c=canvasRef.current,ctx=c.getContext('2d'),p=pos(e);ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();last.current=p;};
  const end=()=>{if(!drawing.current)return;drawing.current=false;onChange(canvasRef.current.toDataURL('image/png'));};
  const clear=()=>{const c=canvasRef.current;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);onChange('');};
  return <div className="jc-signature-wrap"><div className="jc-signature-label"><b>Customer Signature</b><button type="button" onClick={clear}>Clear</button></div><canvas ref={canvasRef} width={900} height={230} onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} className="jc-signature-canvas"/><small>Customer signs above using mouse, touch or a touchscreen.</small></div>;
}

const blankJobCardForm = () => ({
  customer:{name:'',address:'',phone:'',mobile:'',email:''},
  vehicle:{bikeId:'',model:'',colour:'',registrationNo:'',vinNo:'',motorNo:'',dateOfSale:'',odometerKm:''},
  receipt:{keyNo:'',toolkit:false,damages:'',mirrorLH:false,mirrorRH:false,mat:false,electricals:false,charger:false},
  service:{warranty:'',freeServiceNo:'',paidServiceNo:'',repairJob:false,repeatJob:false,accidentalJob:false,postWarranty:false,others:false,othersText:''},
  technicianName:'', startingTime:'', closingTime:'',
  serviceLines:Array.from({length:6},()=>({customerVoice:'',supervisorAdvice:'',jobDone:false,estimatedCost:''})),
  estimate:{repairCost:'',costOfParts:'',deliveryTime:'',supervisorSignature:''},
  acknowledgement:{jobCardNo:'',date:'',estimatedCost:'',inDate:'',inTime:'',expectedDate:'',expectedTime:'',deliveryDate:'',deliveryTime:''},
  authorizationText:'I / We authorise the above work and understand that further repairs may be required during the course of work. I / We have received the vehicle in the condition recorded above.',
  signatureData:'', notes:''
});

function buildJobCardForm(job) {
  const f=blankJobCardForm();
  const c=job?.customerId||{}; const v=job?.commandVehicleId||job?.vehicleId||job?.vehicleSnapshot||{}; const comp=job?.complaintId||{}; const data=job?.jobCard?.jobCardData||{};
  const old={...f,...data};
  old.customer={...f.customer,...(data.customer||{})};
  old.vehicle={...f.vehicle,...(data.vehicle||{})};
  old.receipt={...f.receipt,...(data.receipt||{})}; old.service={...f.service,...(data.service||{})}; old.estimate={...f.estimate,...(data.estimate||{})}; old.acknowledgement={...f.acknowledgement,...(data.acknowledgement||{})};
  old.serviceLines=Array.isArray(data.serviceLines)&&data.serviceLines.length?data.serviceLines.map((x,i)=>({...f.serviceLines[i%6],...x})):f.serviceLines;
  old.customer={...old.customer,name:old.customer.name||c.name||job?.customerSnapshot?.name||'',phone:old.customer.phone||c.phone||job?.customerSnapshot?.phone||'',mobile:old.customer.mobile||c.phone||job?.customerSnapshot?.phone||'',email:old.customer.email||c.email||job?.customerSnapshot?.email||'',address:old.customer.address||(typeof c.address==='string'?c.address:'')||(typeof job?.customerSnapshot?.address==='string'?job.customerSnapshot.address:'')||''};
  old.vehicle={...old.vehicle,bikeId:old.vehicle.bikeId||v.bikeId||job?.bikeId||'',model:old.vehicle.model||v.model||'',colour:old.vehicle.colour||v.color||v.colour||'',registrationNo:old.vehicle.registrationNo||v.registrationNo||'',vinNo:old.vehicle.vinNo||v.vin||v.chassisNo||'',motorNo:old.vehicle.motorNo||v.motorNo||'',dateOfSale:old.vehicle.dateOfSale||v.dateOfSale||'',odometerKm:old.vehicle.odometerKm||job?.odometerReading||v.odometerKm||''};
  old.technicianName=old.technicianName||job?.technicianId?.name||'';
  old.serviceLines[0]={...old.serviceLines[0],customerVoice:old.serviceLines[0].customerVoice||comp.message||job?.problem||''};
  old.acknowledgement={...old.acknowledgement,jobCardNo:old.acknowledgement.jobCardNo||job?.jobCard?.jobCardNumber||`JC-${String(job?._id||'').slice(-8).toUpperCase()}`,date:old.acknowledgement.date||new Date().toISOString().slice(0,10)};
  old.signatureData=old.signatureData||job?.jobCard?.customerSignature||'';
  return old;
}

function DigitalJobCardModal({ job: sourceJob, mode='assigned', call, user, onClose, onCreated, onCompleted, historyLookup }) {
  const [job,setJob]=useState(sourceJob||null); const [form,setForm]=useState(()=>buildJobCardForm(sourceJob));
  const [stage,setStage]=useState('edit'); const [busy,setBusy]=useState(false); const [history,setHistory]=useState(null); const [historyBusy,setHistoryBusy]=useState(false);
  const set=(path,val)=>setForm(f=>{const root=Array.isArray(f)?[...f]:{...f};const parts=path.split('.');let cur=root;for(let i=0;i<parts.length-1;i++){const key=parts[i];const next=cur[key];cur[key]=Array.isArray(next)?[...next]:(next&&typeof next==='object'?{...next}:{});cur=cur[key];}cur[parts[parts.length-1]]=val;return root;});
  const bikeId=job?.bikeId||job?.commandVehicleId?.bikeId||job?.vehicleSnapshot?.bikeId||form.vehicle.bikeId||'';
  useEffect(()=>{let alive=true;const id=job?._id||job?.id;if(!id)return;call(`/staff/jobs/${id}/job-card`).then(card=>{if(!alive||!card)return;setForm(f=>{const data=card.jobCardData||{};return {...f,...data,customer:{...f.customer,...(data.customer||{})},vehicle:{...f.vehicle,...(data.vehicle||{})},receipt:{...f.receipt,...(data.receipt||{})},service:{...f.service,...(data.service||{})},estimate:{...f.estimate,...(data.estimate||{})},acknowledgement:{...f.acknowledgement,...(data.acknowledgement||{})},serviceLines:Array.isArray(data.serviceLines)&&data.serviceLines.length?data.serviceLines:f.serviceLines,signatureData:data.signatureData||card.customerSignature||f.signatureData}})}).catch(()=>{});return()=>{alive=false}},[job?._id||job?.id]);
  const lookup=async(valueOverride)=>{const entered=String(valueOverride||'').trim();const id=String(form.vehicle.bikeId||bikeId||'').trim();const vin=String(form.vehicle.vinNo||'').trim();const key=entered||id||vin;if(!key)return;try{setHistoryBusy(true);const params=new URLSearchParams();if(entered&&entered===vin)params.set('chassisNo',entered);else if(entered&&entered===id)params.set('bikeId',entered);else {if(id)params.set('bikeId',id);if(vin)params.set('chassisNo',vin);}const h=await call(`/staff/vehicle-history?${params.toString()}`);setHistory(h||null);if(h?.vehicle){const v=h.vehicle;setForm(f=>({...f,vehicle:{...f.vehicle,bikeId:v.bikeId||f.vehicle.bikeId||'',model:f.vehicle.model||`${v.make||''} ${v.model||''}`.trim(),registrationNo:f.vehicle.registrationNo||v.registrationNo||'',vinNo:f.vehicle.vinNo||v.chassisNo||v.vin||'',motorNo:f.vehicle.motorNo||v.motorNo||'',odometerKm:f.vehicle.odometerKm||v.odometerKm||''},customer:{...f.customer,name:f.customer.name||h.latest?.customer?.name||'',phone:f.customer.phone||h.latest?.customer?.phone||'',mobile:f.customer.mobile||h.latest?.customer?.phone||'',email:f.customer.email||h.latest?.customer?.email||''}}));}}catch(e){setHistory(null)}finally{setHistoryBusy(false)}};
  const validate=()=>{if(!form.customer.name.trim())return 'Customer name is required.';if(!form.customer.phone.trim()&&!form.customer.mobile.trim())return 'Customer mobile number is required.';if(!bikeId&&!form.vehicle.registrationNo.trim())return 'Bike ID or registration number is required.';if(!form.serviceLines.some(x=>x.customerVoice.trim()))return 'Customer complaint / customer voice is required.';if(!form.signatureData)return 'Customer signature is required.';return ''};
  const saveInitial=async()=>{const err=validate();if(err)return alert(err);setBusy(true);try{let current=job;if(mode==='create'&&!current){const res=await call('/staff/own-job-cards',{method:'post',data:{customer:{name:form.customer.name,phone:form.customer.phone||form.customer.mobile,email:form.customer.email,address:form.customer.address},bike:{bikeId:form.vehicle.bikeId||bikeId,registrationNo:form.vehicle.registrationNo,chassisNo:form.vehicle.vinNo,motorNo:form.vehicle.motorNo,make:form.vehicle.model.split(' ')[0]||'',model:form.vehicle.model,odometerKm:form.vehicle.odometerKm},problem:form.serviceLines.find(x=>x.customerVoice)?.customerVoice||'',priority:'NORMAL',serviceType:'STAFF_CREATED_SERVICE',notes:form.notes}});current=res.job;setJob(current);onCreated?.(current);}
      const id=current?._id||current?.id; if(!id)throw Error('Job could not be created'); const cardData={jobCardNumber:form.acknowledgement.jobCardNo||`JC-${String(id).slice(-8).toUpperCase()}`,complaint:form.serviceLines[0]?.customerVoice||current.problem||'',customerApproval:true,customerSignature:form.signatureData,customerSignatureAt:new Date(),previewSubmittedAt:new Date(),submittedAt:new Date(),jobCardData:form,vehicleReceiptCondition:form.receipt,serviceTypeData:form.service,estimateData:form.estimate,authorizationText:form.authorizationText}; const saved=await call(`/staff/jobs/${id}/job-card`,{method:'put',data:cardData}); setJob({...current,jobCard:saved}); setStage('saved');}catch(e){alert(e.response?.data?.message||e.message||'Could not save job card')}finally{setBusy(false)}};
  const complete=async()=>{if(!job)return;const err=validate();if(err)return alert(err);if(!form.vehicle.odometerKm||form.vehicle.odometerKm==='')return alert('Current odometer reading is required.');setBusy(true);try{const id=job._id||job.id;const now=new Date();const finalForm={...form,closingTime:form.closingTime||new Date().toISOString().slice(0,16)};setForm(finalForm);const res=await call(`/staff/jobs/${id}/complete`,{method:'post',data:{completedAt:now.toISOString(),elapsedSeconds:job.elapsedSeconds||0,remarks:form.serviceLines.map(x=>x.supervisorAdvice).filter(Boolean).join('\n'),odometerReading:Number(form.vehicle.odometerKm),batteryPercent:job.batteryPercent??job.commandVehicleId?.batterySoc,diagnosis:form.serviceLines.map(x=>x.customerVoice).filter(Boolean).join('\n'),workPerformed:form.serviceLines.map(x=>x.supervisorAdvice).filter(Boolean).join('\n'),solution:form.serviceLines.map(x=>x.supervisorAdvice).filter(Boolean).join('\n'),partsReplaced:'',completionNotes:form.notes,signatureData:form.signatureData,jobCardData:finalForm,vehicleReceiptCondition:finalForm.receipt,serviceTypeData:form.service,estimateData:form.estimate,authorizationText:form.authorizationText}});setStage('completed');onCompleted?.(res); }catch(e){alert(e.response?.data?.message||e.message||'Could not complete job card')}finally{setBusy(false)}};
  const saveDuringWork=async()=>{if(!job)return;setBusy(true);try{const id=job._id||job.id;await call(`/staff/jobs/${id}/job-card`,{method:'put',data:{jobCardNumber:form.acknowledgement.jobCardNo,jobCardData:form,vehicleReceiptCondition:form.receipt,serviceTypeData:form.service,estimateData:form.estimate,customerSignature:form.signatureData,technicianNotes:form.notes}});alert('Job Card details saved.');}catch(e){alert(e.response?.data?.message||e.message||'Could not save details')}finally{setBusy(false)}};
  const title=mode==='final'?'Complete Job Card':mode==='create'?'Create Job Card':'Job Card';
  return <div className="jc-modal-backdrop"><div className="jc-modal">
    <div className="jc-modal-head"><div><span>ALLEV · DIGITAL JOB CARD</span><h2>{title}</h2><small>Bike ID: {bikeId||form.vehicle.bikeId||'—'} · Chassis / VIN: {form.vehicle.vinNo||'—'} · {form.vehicle.model||'Vehicle'} {job?.problem?`· ${job.problem}`:''}</small></div><button onClick={()=>!busy&&onClose()}><X size={18}/></button></div>
    {stage==='saved'&&<div className="jc-success-banner"><CheckCircle size={20}/><div><b>Job Card submitted successfully</b><span>Customer details, vehicle condition and signature are saved. Start the work timer when the technician begins.</span></div><button onClick={onClose}>Continue</button></div>}
    {stage==='completed'&&<div className="jc-success-banner complete"><CheckCircle size={20}/><div><b>Job Card completed and submitted</b><span>The complete service report is now stored against this vehicle and complaint.</span></div><button onClick={onClose}>Done</button></div>}
    {stage!=='saved'&&stage!=='completed'&&<>
      <div className="jc-stepbar"><span className="active">1 · Details</span><span>2 · Customer sign</span><span>3 · Preview</span>{mode==='final'&&<span>4 · Complete</span>}</div>
      {stage==='edit'&&<div className="jc-body">
        <section className="jc-paper">
          <div className="jc-paper-title"><img src={allevLogo} alt="AllEV"/><div><b>JOB CARD</b><small>Job Card No. {form.acknowledgement.jobCardNo||'—'}</small></div></div>
          <div className="jc-grid jc-top"><div><h4>Customer Details</h4><div className="jc-fields">{[['customer.name','Name'],['customer.address','Address'],['customer.phone','Tel. No.'],['customer.mobile','Mobile'],['customer.email','E-mail id']].map(([k,l])=><label key={k}>{l}<input value={k.split('.').reduce((o,x)=>o[x],form)} onChange={e=>set(k,e.target.value)}/></label>)}</div></div><div><h4>Vehicle Details</h4><div className="jc-fields">{[['vehicle.bikeId','Bike ID'],['vehicle.vinNo','Chassis / VIN Number'],['vehicle.model','Model Name'],['vehicle.colour','Colour'],['vehicle.registrationNo','Reg No.'],['vehicle.motorNo','Motor No.'],['vehicle.dateOfSale','Date of sale'],['vehicle.odometerKm','Kms covered']].map(([k,l])=><label key={k}>{l}<input value={k.split('.').reduce((o,x)=>o[x],form)} onChange={e=>set(k,e.target.value)} onBlur={(k==='vehicle.bikeId'||k==='vehicle.vinNo')?e=>lookup(e.target.value):undefined}/></label>)}</div></div><div><h4>Vehicle Receipt Condition</h4><div className="jc-condition"><label>Key No.<input value={form.receipt.keyNo} onChange={e=>set('receipt.keyNo',e.target.value)}/></label><label>Damages / Breakages<textarea value={form.receipt.damages} onChange={e=>set('receipt.damages',e.target.value)}/></label>{[['toolkit','Tool Kit'],['mirrorLH','Mirrors L/H'],['mirrorRH','Mirrors R/H'],['mat','Mat'],['electricals','Electricals'],['charger','Charger']].map(([k,l])=><label className="jc-check" key={k}><input type="checkbox" checked={!!form.receipt[k]} onChange={e=>set(`receipt.${k}`,e.target.checked)}/>{l}</label>)}</div></div></div>
          <div className="jc-section"><h4>Type of Service</h4><div className="jc-check-row">{[['warranty','Warranty'],['freeServiceNo','Free service no.'],['paidServiceNo','Paid service No.'],['repairJob','Repair job'],['repeatJob','Repeat job'],['accidentalJob','Accidental job'],['postWarranty','Post warranty / paid service'],['others','Others']].map(([k,l])=><label key={k}><input type={k.includes('No')?'text':'checkbox'} checked={k.includes('No')?undefined:!!form.service[k]} value={k.includes('No')?form.service[k]:undefined} onChange={e=>set(`service.${k}`,k.includes('No')?e.target.value:e.target.checked)}/>{l}</label>)}</div>{form.service.others&&<input className="jc-inline" placeholder="Other service" value={form.service.othersText} onChange={e=>set('service.othersText',e.target.value)}/>}</div>
          <div className="jc-tech-row"><label>Technician Name<input value={form.technicianName} onChange={e=>set('technicianName',e.target.value)}/></label><label>Starting time<input type="datetime-local" value={form.startingTime} onChange={e=>set('startingTime',e.target.value)}/></label><label>Closing time<input type="datetime-local" value={form.closingTime} onChange={e=>set('closingTime',e.target.value)}/></label></div>
          <div className="jc-lines"><div className="jc-lines-head"><span>Sr.</span><span>Customer voice</span><span>Supervisor advice to Technician</span><span>Job Done</span><span>Estimated Cost</span></div>{form.serviceLines.map((row,i)=><div className="jc-line" key={i}><span>{i+1}</span><textarea value={row.customerVoice} onChange={e=>set(`serviceLines.${i}.customerVoice`,e.target.value)}/><textarea value={row.supervisorAdvice} onChange={e=>set(`serviceLines.${i}.supervisorAdvice`,e.target.value)}/><input type="checkbox" checked={row.jobDone} onChange={e=>set(`serviceLines.${i}.jobDone`,e.target.checked)}/><input value={row.estimatedCost} onChange={e=>set(`serviceLines.${i}.estimatedCost`,e.target.value)}/></div>)}</div>
          <div className="jc-estimate"><h4>Estimation</h4><label>Cost of Repair<input value={form.estimate.repairCost} onChange={e=>set('estimate.repairCost',e.target.value)}/></label><label>Cost of parts<input value={form.estimate.costOfParts} onChange={e=>set('estimate.costOfParts',e.target.value)}/></label><label>Delivery Time<input value={form.estimate.deliveryTime} onChange={e=>set('estimate.deliveryTime',e.target.value)}/></label><label>Supervisor Signature / Name<input value={form.estimate.supervisorSignature} onChange={e=>set('estimate.supervisorSignature',e.target.value)}/></label></div>
          <div className="jc-auth"><h4>Customer Authorisation</h4><textarea value={form.authorizationText} onChange={e=>set('authorizationText',e.target.value)}/></div>
          <SignaturePad value={form.signatureData} onChange={v=>set('signatureData',v)}/>
          <div className="jc-ack"><h4>Acknowledgement</h4><div className="jc-ack-grid">{[['jobCardNo','Job Card No.'],['date','Date'],['estimatedCost','Estimated Cost'],['inDate','IN DATE'],['inTime','TIME'],['expectedDate','Expected'],['expectedTime','TIME'],['deliveryDate','Delivery date'],['deliveryTime','TIME']].map(([k,l])=><label key={k}>{l}<input value={form.acknowledgement[k]} onChange={e=>set(`acknowledgement.${k}`,e.target.value)}/></label>)}</div></div>
        </section>
        <aside className="jc-side"><div className="jc-side-card"><b>Vehicle History</b><span>Enter/confirm the Bike ID or Chassis / VIN Number to auto-fill the vehicle and see previous job cards.</span><button onClick={lookup} disabled={historyBusy}>{historyBusy?'Checking…':'Check Previous Job Cards'}</button>{history?.history?.length?<div className="jc-history-list">{history.history.slice(0,6).map(h=><div key={h._id}><b>{h.problem||h.serviceType||'Service'}</b><small>{h.status} · {h.completedAt?new Date(h.completedAt).toLocaleDateString('en-IN'):'—'}</small><span>{h.workPerformed||h.solution||h.diagnosis||'No report summary'}</span></div>)}</div>:<small>{history?'No previous job cards found for this vehicle.':''}</small>}</div><div className="jc-side-card"><b>Workflow</b><div className="jc-flow"><span>✓ Customer / vehicle auto-fill</span><span>✓ Customer signature</span><span>→ Preview & submit</span><span>→ Start / pause / resume</span><span>→ Complete final report</span><span>→ Franchisee + customer + Command Center</span></div></div></aside>
      </div>
      }
      {stage==='edit'&&<div className="jc-modal-actions">{mode==='final'?<button className="jc-primary" onClick={complete} disabled={busy}>{busy?'Submitting…':'✓ Submit Final Job Card & Complete'}</button>:<button className="jc-primary" onClick={()=>setStage('preview')} disabled={busy}>Preview Job Card →</button>}<button className="jc-secondary" onClick={onClose} disabled={busy}>Cancel</button></div>}
    </>}
    {stage==='preview'&&<div className="jc-preview"><div className="jc-preview-note"><b>Preview before submit</b><span>Check every field and customer signature. Nothing is submitted until you confirm.</span></div><div className="jc-paper jc-preview-paper"><div className="jc-paper-title"><img src={allevLogo} alt="AllEV"/><div><b>JOB CARD</b><small>{form.acknowledgement.jobCardNo}</small></div></div><div className="jc-preview-grid"><div><b>Customer</b><span>{form.customer.name}</span><span>{form.customer.mobile||form.customer.phone}</span><span>{form.customer.email}</span></div><div><b>Vehicle</b><span>{form.vehicle.model}</span><span>Bike ID: {form.vehicle.bikeId||bikeId||'—'}</span><span>Chassis / VIN: {form.vehicle.vinNo||'—'}</span><span>{form.vehicle.registrationNo}</span></div><div><b>Complaint / Customer Voice</b><span>{form.serviceLines.map(x=>x.customerVoice).filter(Boolean).join(' · ')}</span></div><div><b>Receipt Condition</b><span>{['toolkit','mirrorLH','mirrorRH','mat','electricals','charger'].filter(k=>form.receipt[k]).join(', ')||'No checklist items marked'}</span></div></div><div className="jc-preview-sign"><b>Customer Signature</b>{form.signatureData?<img src={form.signatureData} alt="Customer signature"/>:<span>Not signed</span>}</div></div><div className="jc-modal-actions"><button className="jc-primary" onClick={saveInitial} disabled={busy}>{busy?'Submitting…':'✓ Confirm & Submit Job Card'}</button><button className="jc-secondary" onClick={()=>setStage('edit')} disabled={busy}>← Edit</button></div></div>}
  </div></div>;
}

// ══════════════════════════════════════════════════════════════════
// MY WORKS — PENDING + COMPLETED + COMPLAINT JOB CARDS
// ══════════════════════════════════════════════════════════════════
function MyWorks({ user, call, setPage }) {
  const { t } = useTranslation();
  const [works, setWorks] = useState(() => store.get('ev_staff_works') || []);
  const [tab, setTab] = useState('jobcards'); // 'jobcards' | 'all' | 'all-tasks' | 'pending-tasks' | 'completed-tasks'
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', priority:'medium', dueDate:'', notes:'' });
  const [jcTab, setJcTab] = useState('pending'); // 'pending' | 'completed'
  const [remarksModal, setRemarksModal] = useState(null); // jobCard being remarked
  const [remarksText, setRemarksText] = useState('');
  const [tick, setTick] = useState(0);
  const [pauseModal, setPauseModal] = useState(null);   // jobCard being paused
  const [pauseReasonText, setPauseReasonText] = useState('');
  const [pauseReasonSelected, setPauseReasonSelected] = useState('');
  const [pauseCustomInput, setPauseCustomInput] = useState('');
  const [pauseDetails, setPauseDetails] = useState({category:'',details:'',expectedResumeAt:'',workCompletedBeforePause:'',partsRequired:''});
  const [customPauseReasons, setCustomPauseReasons] = useState(
    () => { try { return JSON.parse(localStorage.getItem('ev_custom_pause_reasons') || '[]'); } catch { return []; } }
  );
  // Completion Proof Modal
  const [proofModal, setProofModal] = useState(null);
  const [proofForm, setProofForm] = useState({ remarks:'', odometerReading:'', batteryPercent:'', diagnosis:'', rootCause:'', workPerformed:'', solution:'', partsReplaced:'', testResult:'', finalCondition:'', recommendations:'', nextServiceAt:'', labourHours:'', completionNotes:'' });
  const [historyModal, setHistoryModal] = useState(null);
  const [ownJobOpen, setOwnJobOpen] = useState(false);
  const [ownCreateBusy, setOwnCreateBusy] = useState(false);
  const [ownHistoryLoading, setOwnHistoryLoading] = useState(false);
  const [ownVehicleHistory, setOwnVehicleHistory] = useState(null);
  const [ownJobForm, setOwnJobForm] = useState({customer:{name:'',phone:'',email:''},bike:{bikeId:'',registrationNo:'',chassisNo:'',motorNo:'',make:'',model:'',odometerKm:'',batterySoc:''},problem:'',priority:'NORMAL',serviceType:'STAFF_CREATED_SERVICE',notes:''});
  const [jobCardEditor, setJobCardEditor] = useState(null);
  const [completedJobCardViewer, setCompletedJobCardViewer] = useState(null);

  // Live tick for elapsed timer
  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Load job cards assigned to this staff member from API ──
  const [jobCards, setJobCards] = useState([]);
  const [jcLoading, setJcLoading] = useState(false);

  const fetchMyJobCards = async () => {
    if (!call) return;
    try {
      setJcLoading(true);
      const staffId = user?._id || user?.id || '';
      const allJobs = await call('/staff/jobs');
      // Filter jobs assigned to this staff member
      const myCards = (allJobs || []).filter(j =>
        j.technicianId === staffId ||
        (j.technicianId && (j.technicianId._id === staffId || j.technicianId.id === staffId))
      );
      setJobCards(myCards);
    } catch (e) {
      console.error('Failed to fetch job cards:', e);
    } finally {
      setJcLoading(false);
    }
  };

  // Initial fetch only — no auto-refresh polling
  useEffect(() => {
    fetchMyJobCards();
  }, [user]);

  const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const fmtElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h+'h ' : ''}${m}m ${s}s`;
  };
  const checkOwnVehicleHistory = async (valueOverride) => {
    const b={...ownJobForm.bike,...(valueOverride||{})}; const params=new URLSearchParams();
    if(b.bikeId)params.set('bikeId',b.bikeId); if(b.registrationNo)params.set('registrationNo',b.registrationNo); if(b.chassisNo)params.set('chassisNo',b.chassisNo); if(b.motorNo)params.set('motorNo',b.motorNo);
    if(!params.toString()){setOwnVehicleHistory(null);return;}
    try{setOwnHistoryLoading(true);const data=await call(`/staff/vehicle-history?${params.toString()}`);setOwnVehicleHistory(data||null);if(data?.vehicle){setOwnJobForm(f=>({...f,bike:{...f.bike,make:f.bike.make||data.vehicle.make||'',model:f.bike.model||data.vehicle.model||'',registrationNo:f.bike.registrationNo||data.vehicle.registrationNo||'',chassisNo:f.bike.chassisNo||data.vehicle.chassisNo||'',motorNo:f.bike.motorNo||data.vehicle.motorNo||'',bikeId:f.bike.bikeId||data.vehicle.bikeId||'',odometerKm:f.bike.odometerKm||data.vehicle.odometerKm||'',batterySoc:f.bike.batterySoc||data.vehicle.batterySoc||''}}));}}catch(e){setOwnVehicleHistory(null)}finally{setOwnHistoryLoading(false)}
  };
  const createOwnJobCard = async () => {
    const f=ownJobForm;if(!f.customer.name.trim()||!f.customer.phone.trim()||!f.bike.bikeId.trim()||!f.problem.trim())return alert('Customer name, phone, Bike ID and problem are required.');
    setOwnCreateBusy(true);try{const res=await call('/staff/own-job-cards',{method:'post',data:f});setJobCards(prev=>[res.job,...prev]);setOwnJobOpen(false);setOwnVehicleHistory(null);setOwnJobForm({customer:{name:'',phone:'',email:''},bike:{bikeId:'',registrationNo:'',chassisNo:'',motorNo:'',make:'',model:'',odometerKm:'',batterySoc:''},problem:'',priority:'NORMAL',serviceType:'STAFF_CREATED_SERVICE',notes:''});setJcTab('pending');setTab('jobcards');alert('Job card created and work started.')}catch(e){alert(e.response?.data?.message||e.message||'Could not create job card')}finally{setOwnCreateBusy(false)}
  };

  const getLiveElapsed = (jc) => {
    if (jc.status === 'IN_PROGRESS' && jc.startedAt && !jc.pausedAt) {
      const base = jc.elapsedSeconds || 0;
      const elapsed = Math.floor((Date.now() - new Date(jc.startedAt).getTime()) / 1000);
      return base + elapsed;
    }
    return jc.elapsedSeconds || 0;
  };

  const openHistory = async (jc) => {
    try {
      const data = await call(`/staff/jobs/${jc._id || jc.id}/history`);
      setHistoryModal(data || {previousJobs:[]});
    } catch(e) { alert(e.response?.data?.message || e.message || 'Could not load vehicle history'); }
  };

  const updateJobCard = async (id, updates) => {
    // Optimistic local update
    setJobCards(prev => prev.map(jc => (jc._id || jc.id) === id ? { ...jc, ...updates } : jc));
    // Persist to backend
    try {
      await call(`/staff/jobs/${id}`, { method: 'put', data: updates });
    } catch (e) {
      console.error('Failed to update job card:', e);
      // Re-fetch to restore correct state on error
      fetchMyJobCards();
    }
  };

  const startWork = async (jc) => {
    const id = jc._id || jc.id;
    const resuming = jc.status === 'PAUSED';
    const startedAt = new Date().toISOString();
    const optimistic = { status:'IN_PROGRESS', startedAt, elapsedSeconds:jc.elapsedSeconds||0, pausedAt:null, pauseReason:resuming?(jc.pauseReason||null):null };
    setJobCards(prev => prev.map(x => (x._id || x.id) === id ? { ...x, ...optimistic } : x));
    try {
      await call(`/staff/jobs/${id}/start`, { method:'post', data:{ startedAt } });
      await fetchMyJobCards();
    } catch(e) {
      console.error('Failed to start job:',e);
      await fetchMyJobCards();
    }
  };

  // Pause step 1: open reason modal
  const openPauseModal = (jc) => {
    setPauseModal(jc);
    setPauseReasonText('');
    setPauseReasonSelected('');
    setPauseCustomInput('');
    setPauseDetails({category:'',details:'',expectedResumeAt:'',workCompletedBeforePause:'',partsRequired:''});
  };

  // Pause step 2: confirm with reason → save & notify franchisee + customer
  const confirmPause = async () => {
    if (!pauseModal) return;
    const id = pauseModal._id || pauseModal.id;
    const elapsed = getLiveElapsed(pauseModal);
    // Determine final reason from selected preset or custom input
    let reason = '';
    if (pauseReasonSelected === '__other__') {
      reason = pauseCustomInput.trim();
      // Save new custom reason for future use
      if (reason && !customPauseReasons.includes(reason)) {
        const updated = [...customPauseReasons, reason];
        setCustomPauseReasons(updated);
        try { localStorage.setItem('ev_custom_pause_reasons', JSON.stringify(updated)); } catch(_) {}
      }
    } else {
      reason = pauseReasonSelected;
    }
    if (!reason) { alert('Please select or enter a pause reason.'); return; }
    reason = reason || 'No reason provided';
    const pausedAt = new Date().toISOString();
    try {
      await call(`/staff/jobs/${id}/pause`, {
        method:'post',
        data:{ pausedAt, elapsedSeconds: elapsed, pauseReason: reason, pauseCategory:pauseDetails.category, pauseDetails:pauseDetails.details, expectedResumeAt:pauseDetails.expectedResumeAt || undefined, workCompletedBeforePause:pauseDetails.workCompletedBeforePause, partsRequired:pauseDetails.partsRequired }
      });
      setJobCards(prev => prev.map(x => (x._id || x.id) === id
        ? { ...x, status:'PAUSED', pausedAt, elapsedSeconds:elapsed, pauseReason:reason }
        : x
      ));
      try {
        const stored = JSON.parse(localStorage.getItem('ev_franchise_job_cards') || '[]');
        localStorage.setItem('ev_franchise_job_cards', JSON.stringify(stored.map(j =>
          (j.id === id || j.jobId === id)
            ? { ...j, status:'PAUSED', pauseReason:reason, pausedAt, elapsedSeconds:elapsed }
            : j
        )));
      } catch (_) {}
      try {
        const custUpdates = JSON.parse(localStorage.getItem('ev_customer_job_updates') || '[]');
        custUpdates.push({
          jobId:id, event:'PAUSED', reason, timestamp:pausedAt,
          vehicleMake:pauseModal.vehicleMake || pauseModal.vehicleId?.make || '',
          vehicleReg:pauseModal.vehicleReg || pauseModal.vehicleId?.registrationNo || '—',
          customerName:pauseModal.customerName || '',
        });
        localStorage.setItem('ev_customer_job_updates', JSON.stringify(custUpdates));
      } catch (_) {}
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Could not pause this job');
      await fetchMyJobCards();
    }
    setPauseModal(null);
    setPauseReasonText('');
    setPauseReasonSelected('');
    setPauseCustomInput('');
    setPauseDetails({category:'',details:'',expectedResumeAt:'',workCompletedBeforePause:'',partsRequired:''});
  };

  // Open proof modal instead of completing immediately
  const markComplete = (jc) => { setJobCardEditor({mode:'final',job:jc}); };

  // Actually submit proof + complete the job
  const submitProofAndComplete = async () => {
    if (!proofModal) return;
    const jc = proofModal;
    const id = jc._id || jc.id;
    const elapsed = getLiveElapsed(jc);
    const completedAt = new Date().toISOString();
    const { remarks, odometerReading, batteryPercent } = proofForm;

    if (!remarks.trim()) { alert('Please enter work remarks before completing.'); return; }
    if (!odometerReading.trim()) { alert('Please enter the current odometer reading.'); return; }
    if (!batteryPercent.trim()) { alert('Please enter the current battery percentage.'); return; }

    try {
      // 1. Complete the job
      await call(`/staff/jobs/${id}/complete`, {
        method:'post',
        data:{
          completedAt,
          elapsedSeconds: elapsed,
          remarks,
          odometerReading: Number(odometerReading),
          batteryPercent: Number(batteryPercent),
          diagnosis: proofForm.diagnosis, rootCause: proofForm.rootCause, workPerformed: proofForm.workPerformed || remarks,
          solution: proofForm.solution, partsReplaced: proofForm.partsReplaced, testResult: proofForm.testResult,
          finalCondition: proofForm.finalCondition, recommendations: proofForm.recommendations, nextServiceAt: proofForm.nextServiceAt,
          labourHours: proofForm.labourHours, completionNotes: proofForm.completionNotes || remarks,
        }
      });

      // 2. Proof is created by the same completion transaction on the backend.
      const bikeId = jc.bikeId || jc.commandVehicleId?.bikeId || jc.vehicleSnapshot?.bikeId || '';

      // 3. Persist bikeId-specific readings locally
      if (bikeId) {
        try {
          const bikeData = JSON.parse(localStorage.getItem('ev_bike_readings') || '{}');
          bikeData[bikeId] = { odometerReading: Number(odometerReading), batteryPercent: Number(batteryPercent), updatedAt: completedAt };
          localStorage.setItem('ev_bike_readings', JSON.stringify(bikeData));
        } catch (_) {}
      }

      setJobCards(prev => prev.map(x => (x._id || x.id) === id
        ? { ...x, status:'COMPLETED', completedAt, elapsedSeconds:elapsed, remarks }
        : x
      ));
      try {
        const stored = JSON.parse(localStorage.getItem('ev_franchise_job_cards') || '[]');
        localStorage.setItem('ev_franchise_job_cards', JSON.stringify(stored.map(j =>
          (j.id === id || j.jobId === id)
            ? { ...j, status:'COMPLETED', completedAt, elapsedSeconds:elapsed, remarks }
            : j
        )));
      } catch (_) {}
      try {
        const cust = JSON.parse(localStorage.getItem('ev_customer_job_updates') || '[]');
        cust.push({
          jobId:id, event:'COMPLETED', remarks, timestamp:completedAt,
          vehicleMake:jc.vehicleMake || jc.vehicleId?.make || '',
          vehicleReg:jc.vehicleReg || jc.vehicleId?.registrationNo || '—',
          customerName:jc.customerName || '',
          odometerReading: Number(odometerReading),
          batteryPercent: Number(batteryPercent),
        });
        localStorage.setItem('ev_customer_job_updates', JSON.stringify(cust));
      } catch (_) {}

      setProofModal(null);
      setProofForm({ remarks:'', odometerReading:'', batteryPercent:'', diagnosis:'', rootCause:'', workPerformed:'', solution:'', partsReplaced:'', testResult:'', finalCondition:'', recommendations:'', nextServiceAt:'', labourHours:'', completionNotes:'' });
      setJcTab('completed');
      await fetchMyJobCards();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Could not complete this job');
      await fetchMyJobCards();
    }
  };

  const submitRemarks = () => {
    if (!remarksModal) return;
    const id = remarksModal._id || remarksModal.id;
    const elapsed = remarksModal.elapsedSeconds || 0;
    const completedAt = new Date().toISOString();
    updateJobCard(id, {
      status: 'COMPLETED',
      completedAt,
      elapsedSeconds: elapsed,
      remarks: remarksText,
    });
    // Sync COMPLETED status to franchisee job cards in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('ev_franchise_job_cards') || '[]');
      const updated = stored.map(j =>
        (j.id === id || j.jobId === id)
          ? { ...j, status: 'COMPLETED', completedAt, elapsedSeconds: elapsed, remarks: remarksText }
          : j
      );
      localStorage.setItem('ev_franchise_job_cards', JSON.stringify(updated));
    } catch (_) {}
    // Push completion event so customer portal can show it
    try {
      const custUpdates = JSON.parse(localStorage.getItem('ev_customer_job_updates') || '[]');
      custUpdates.push({
        jobId: id,
        event: 'COMPLETED',
        remarks: remarksText,
        timestamp: completedAt,
        vehicleMake: remarksModal.vehicleMake || remarksModal.vehicleId?.make || '',
        vehicleReg: remarksModal.vehicleReg || remarksModal.vehicleId?.registrationNo || '—',
        customerName: remarksModal.customerName || '',
      });
      localStorage.setItem('ev_customer_job_updates', JSON.stringify(custUpdates));
    } catch (_) {}
    setRemarksModal(null);
    setRemarksText('');
    setJcTab('completed');
  };


  // ── General Works ──
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

  const filtered = tab === 'pending-tasks' ? works.filter(w => w.status === 'pending')
    : tab === 'completed-tasks' ? works.filter(w => w.status === 'completed')
    : works;

  const PRIO_COLOR = { high:'#dc2626', medium:'#d97706', low:'#16a34a', HIGH:'#dc2626', NORMAL:'#2563eb', LOW:'#16a34a', URGENT:'#dc2626' };
  const pendingCards = jobCards.filter(jc => jc.status !== 'COMPLETED');
  const completedCards = jobCards.filter(jc => jc.status === 'COMPLETED');

  return <>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:4}}>
      <PageHeader title="My Works" sub="Complaint job cards assigned to you and your personal task list." back={() => setPage && setPage('dashboard')} />
      <button onClick={()=>setJobCardEditor({mode:'create',job:null})} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 15px',border:0,borderRadius:10,background:'linear-gradient(135deg,#2563eb,#4f46e5)',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer',boxShadow:'0 8px 20px rgba(37,99,235,.18)'}}>＋ Create Job Card</button>
      <button onClick={fetchMyJobCards} disabled={jcLoading} style={{
        display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8,
        background:'#f8fafc', border:'1.5px solid #e2e8f0', cursor:'pointer', fontWeight:600, fontSize:13,
        color:'#374151', marginTop:4, opacity: jcLoading ? 0.6 : 1,
      }}>
        {jcLoading ? '⏳ Refreshing…' : '↻ Refresh'}
      </button>
    </div>

    {/* Work modes — no duplicated Pending/Completed tabs */}
    <div className="works-mode-tabs">
      <button className={'works-mode-btn'+(tab==='jobcards'?' active':'')} onClick={() => setTab('jobcards')}>
        <Briefcase size={17}/> <span>Job Cards</span><b>{jobCards.length}</b>
      </button>
      <button className={'works-mode-btn'+(tab==='all'?' active':'')} onClick={() => setTab('all')}>
        <ClipboardList size={17}/> <span>My Tasks</span><b>{works.length}</b>
      </button>
    </div>

    {/* ── JOB CARDS TAB ── */}
    {tab === 'jobcards' && (
      <div>
        <div className="job-card-summary-grid">
          <button className={'job-card-summary pending'+(jcTab==='pending'?' active':'')} onClick={() => setJcTab('pending')}>
            <span className="job-card-summary-icon">⏳</span><span><b>{pendingCards.length}</b><small>Pending Job Cards</small></span><ChevronRight size={18}/>
          </button>
          <button className={'job-card-summary completed'+(jcTab==='completed'?' active':'')} onClick={() => setJcTab('completed')}>
            <span className="job-card-summary-icon">✓</span><span><b>{completedCards.length}</b><small>Completed Job Cards</small></span><ChevronRight size={18}/>
          </button>
        </div>

        {jcLoading && (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-title">Loading job cards…</div>
          </div>
        )}
        {!jcLoading && (jcTab==='pending' ? pendingCards : completedCards).length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">{jcTab==='pending'?'🪪':'✅'}</div>
            <div className="empty-title">No {jcTab} job cards</div>
            <div className="empty-sub">{jcTab==='pending' ? 'Job cards assigned by the franchisee will appear here.' : 'Completed job cards will appear here.'}</div>
          </div>
        )}

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          {(jcTab==='pending' ? pendingCards : completedCards).map(jc => {
            const isRunning = jc.status === 'IN_PROGRESS';
            const liveElapsed = tick >= 0 ? getLiveElapsed(jc) : 0; // tick dependency for re-render
            const prioColor = PRIO_COLOR[jc.priority] || '#64748b';
            return (
              <div key={jc._id || jc.id} style={{
                border:`1.5px solid ${isRunning?'#2563eb':'#e2e8f0'}`,
                borderRadius:14,
                background: isRunning ? '#eff6ff' : jc.status==='COMPLETED' ? '#f0fdf4' : '#fff',
                boxShadow: isRunning ? '0 0 0 3px #bfdbfe' : 'none',
                overflow:'hidden',
              }}>
                {/* Card header */}
                <div style={{padding:'14px 16px', borderBottom:'1px solid #f1f5f9'}}>
                  <div style={{display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800, fontSize:15}}>🚗 Bike ID: {jc.bikeId || jc.commandVehicleId?.bikeId || '—'} · Chassis / VIN: {jc.commandVehicleId?.chassisNo || jc.vehicleSnapshot?.chassisNo || '—'} · {jc.vehicleMake || jc.commandVehicleId?.make || jc.vehicleId?.make || ''} {jc.vehicleModel || jc.commandVehicleId?.model || jc.vehicleId?.model || ''}</div>
                      <div style={{fontSize:12, color:'#64748b', marginTop:2}}>Reg: {jc.vehicleReg || jc.commandVehicleId?.registrationNo || jc.vehicleId?.registrationNo || '—'} · Customer: {jc.customerName || jc.customerId?.name || 'Customer'} · {jc.customerPhone || jc.customerId?.phone || '—'}{jc.rentalId ? ` · ${jc.rentalId.rentalPlan==='SALE'?'Purchase':jc.rentalId.rentalPlan+' rental'} · Due ${jc.rentalId.dueDate ? new Date(jc.rentalId.dueDate).toLocaleDateString('en-IN') : '—'}` : ''}</div>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
                      <span style={{fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                        background: isRunning?'#dbeafe':jc.status==='COMPLETED'?'#dcfce7':jc.status==='PAUSED'?'#fef3c7':'#f3e8ff',
                        color: isRunning?'#1d4ed8':jc.status==='COMPLETED'?'#166534':jc.status==='PAUSED'?'#92400e':'#7c3aed',
                      }}>
                        {isRunning ? '▶ In Progress' : jc.status==='PAUSED' ? '⏸ Paused' : jc.status==='COMPLETED' ? '✅ Completed' : '⏳ Pending'}
                      </span>
                      <span style={{fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:prioColor+'18', color:prioColor}}>
                        {jc.priority}
                      </span>
                    </div>
                  </div>

                  {/* Problem & Description */}
                  <div style={{fontSize:13, color:'#374151', marginBottom:6}}>
                    <span style={{fontWeight:600}}>Problem: </span>{jc.problem || jc.message || '—'}
                  </div>
                  {jc.description && jc.description !== (jc.problem || jc.message) && (
                    <div style={{fontSize:12, color:'#475569', marginBottom:6}}>
                      <span style={{fontWeight:600}}>Work to do: </span>{jc.description}
                    </div>
                  )}

                  {/* Time info */}
                  <div style={{display:'flex', gap:12, fontSize:11, color:'#64748b', flexWrap:'wrap', marginTop:6}}>
                    <span>📅 Created: {fmtDt(jc.createdAt)}</span>
                    {jc.startedAt && <span>▶ Started: {fmtDt(jc.startedAt)}</span>}
                    {jc.completedAt && <span>✓ Completed: {fmtDt(jc.completedAt)}</span>}
                  </div>
                </div>

                {/* Timer bar */}
                <div style={{padding:'10px 16px', background: isRunning?'#dbeafe':'#f8fafc', display:'flex', alignItems:'center', gap:12, justifyContent:'space-between', flexWrap:'wrap'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    {isRunning && <span style={{width:8,height:8,borderRadius:'50%',background:'#2563eb',display:'inline-block',animation:'pulse 1s infinite'}}/>}
                    <span style={{fontSize:isRunning?15:13, fontWeight:700, color:isRunning?'#1d4ed8':'#374151', fontVariantNumeric:'tabular-nums', letterSpacing:'0.5px'}}>
                      ⏱ {fmtElapsed(liveElapsed)}
                    </span>
                    {isRunning && <span style={{fontSize:11,color:'#64748b'}}>running…</span>}
                  </div>

                  {/* Action Buttons */}
                  {jc.status === 'COMPLETED' ? (
                    <div style={{display:'flex', gap:8}}>
                      <button onClick={() => setCompletedJobCardViewer(jc)} style={{background:'#0f172a',color:'#fff',border:'none',borderRadius:8,padding:'7px 13px',cursor:'pointer',fontWeight:700,fontSize:12}}>📄 View Complete Job Card</button>
                      <button onClick={() => openHistory(jc)} style={{background:'#fff',color:'#0f172a',border:'1px solid #cbd5e1',borderRadius:8,padding:'7px 13px',cursor:'pointer',fontWeight:700,fontSize:12}}>📚 Previous Work</button>
                    </div>
                  ) : (
                    <div style={{display:'flex', gap:8}}>
                      <button onClick={() => setJobCardEditor({mode:'assigned',job:jc})} style={{background:'#0f172a',color:'#fff',border:'none',borderRadius:8,padding:'7px 13px',cursor:'pointer',fontWeight:700,fontSize:12}}>📄 {isRunning||jc.status==='PAUSED'?'Edit Job Card':'Open Job Card'}</button>
                      {!isRunning && jc.status !== 'PAUSED' && (
                        <button onClick={() => startWork(jc)} style={{
                          background:'#16a34a', color:'#fff', border:'none', borderRadius:8,
                          padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12,
                        }}>▶ Start Work</button>
                      )}
                      {jc.status === 'PAUSED' && (
                        <button onClick={() => startWork(jc)} style={{
                          background:'#2563eb', color:'#fff', border:'none', borderRadius:8,
                          padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12,
                        }}>▶ Resume</button>
                      )}
                      {isRunning && (
                        <button onClick={() => openPauseModal(jc)} style={{
                          background:'#d97706', color:'#fff', border:'none', borderRadius:8,
                          padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12,
                        }}>⏸ Pause</button>
                      )}
                      
                      <button onClick={() => markComplete(jc)} style={{
                        background:'#7c3aed', color:'#fff', border:'none', borderRadius:8,
                        padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12,
                      }}>✅ Mark Complete</button>
                      <button onClick={() => openHistory(jc)} style={{background:'#0f172a',color:'#fff',border:'none',borderRadius:8,padding:'7px 13px',cursor:'pointer',fontWeight:700,fontSize:12}}>📚 Previous Work</button>
                    </div>
                  )}
                </div>

                {/* Pause Reason */}
                {jc.pauseReason && jc.status === 'PAUSED' && (
                  <div style={{padding:'10px 16px', borderTop:'1px solid #fef3c7', background:'#fffbeb'}}>
                    <span style={{fontSize:12, color:'#92400e'}}><b>⏸ Pause Reason:</b> {jc.pauseReason}</span>
                    <span style={{fontSize:11, color:'#b45309', marginLeft:8}}>· Franchisee &amp; customer notified</span>
                  </div>
                )}
                {/* Remarks (completed) */}
                {jc.remarks && (
                  <div style={{padding:'10px 16px', borderTop:'1px solid #f1f5f9', background:'#f0fdf4'}}>
                    <span style={{fontSize:12, color:'#166534'}}><b>📝 My Remarks:</b> {jc.remarks}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* ── GENERAL WORKS TABS ── */}
    {(tab === 'all' || tab === 'pending-tasks' || tab === 'completed-tasks') && (
      <>
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
              <div className="empty-title">No {tab === 'all' ? '' : tab === 'pending-tasks' ? 'pending' : 'completed'} works</div>
              <div className="empty-sub">{tab === 'all' ? 'Add your first work item to get started.' : `No ${tab === 'pending-tasks' ? 'pending' : 'completed'} works right now.`}</div>
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
                    <span className="prio-tag" style={{ background: (PRIO_COLOR[w.priority]||'#64748b')+'18', color: PRIO_COLOR[w.priority]||'#64748b' }}>{w.priority}</span>
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
      </>
    )}

    {/* ── Previous vehicle work history ── */}
    {false && ownJobOpen && <div className="feature-modal-backdrop" onClick={()=>!ownCreateBusy&&setOwnJobOpen(false)}><div className="feature-modal-panel" onClick={e=>e.stopPropagation()} style={{maxWidth:760,width:'96%',maxHeight:'90vh',overflow:'auto'}}>
      <div className="feature-card-head"><div><b style={{fontSize:18}}>Create Job Card</b><small style={{display:'block',color:'#64748b',marginTop:3}}>Create a staff-owned service job, review previous bike work, then start work immediately.</small></div><button className="icon-btn" onClick={()=>!ownCreateBusy&&setOwnJobOpen(false)}>✕</button></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,padding:'16px'}}>
        <div style={{gridColumn:'1/-1',fontSize:11,fontWeight:800,letterSpacing:'.08em',color:'#64748b'}}>CUSTOMER DETAILS</div>
        {['name','phone','email'].map(k=><label key={k} className="form-field"><span>{k==='name'?'Customer name':k==='phone'?'Phone':'Email'}</span><input value={ownJobForm.customer[k]} onChange={e=>setOwnJobForm(f=>({...f,customer:{...f.customer,[k]:e.target.value}}))} placeholder={k==='phone'?'10-digit number':''}/></label>)}
        <div style={{gridColumn:'1/-1',fontSize:11,fontWeight:800,letterSpacing:'.08em',color:'#64748b',marginTop:4}}>BIKE DETAILS</div>
        {['bikeId','registrationNo','chassisNo','motorNo','make','model','odometerKm','batterySoc'].map(k=><label key={k} className="form-field"><span>{k==='bikeId'?'Bike ID':k==='registrationNo'?'Registration No':k==='chassisNo'?'Chassis No':k==='motorNo'?'Motor No':k==='odometerKm'?'Odometer km':k==='batterySoc'?'Battery SOC %':k.charAt(0).toUpperCase()+k.slice(1)}</span><input type={['odometerKm','batterySoc'].includes(k)?'number':'text'} value={ownJobForm.bike[k]} onChange={e=>setOwnJobForm(f=>({...f,bike:{...f.bike,[k]:e.target.value}}))} onBlur={()=>['bikeId','registrationNo','chassisNo','motorNo'].includes(k)&&checkOwnVehicleHistory()}/></label>)}
        <div style={{gridColumn:'1/-1',display:'flex',justifyContent:'flex-end'}}><button className="btn-ghost" onClick={()=>checkOwnVehicleHistory()} disabled={ownHistoryLoading}>{ownHistoryLoading?'Checking previous work…':'↻ Check previous bike work'}</button></div>
      </div>
      {ownVehicleHistory?.vehicle && <div style={{margin:'0 16px 14px',padding:14,borderRadius:14,background:'#f8fafc',border:'1px solid #e2e8f0'}}><div style={{fontSize:11,fontWeight:800,color:'#475569',letterSpacing:'.08em'}}>MATCHED VEHICLE</div><div style={{fontWeight:800,marginTop:4}}>{ownVehicleHistory.vehicle.bikeId||'Bike'} · {ownVehicleHistory.vehicle.make} {ownVehicleHistory.vehicle.model}</div><div style={{fontSize:12,color:'#64748b',marginTop:4}}>Reg {ownVehicleHistory.vehicle.registrationNo||'—'} · Odometer {ownVehicleHistory.vehicle.odometerKm??'—'} km · SOC {ownVehicleHistory.vehicle.batterySoc??'—'}%</div></div>}
      <div style={{margin:'0 16px 16px',padding:14,borderRadius:16,border:'1px solid #fde68a',background:'#fffbeb'}}><div style={{fontWeight:800,color:'#92400e',marginBottom:8}}>Previous work & problems</div>{ownHistoryLoading?<div style={{fontSize:12,color:'#92400e'}}>Loading history…</div>:ownVehicleHistory?.history?.length?<div style={{display:'grid',gap:8,maxHeight:180,overflow:'auto'}}>{ownVehicleHistory.history.slice(0,8).map((h,i)=><div key={h._id||i} style={{background:'#fff',border:'1px solid #fef3c7',borderRadius:10,padding:'9px 10px',fontSize:12}}><b>{h.problem||'Service record'}</b><div style={{color:'#64748b',marginTop:3}}>{h.workPerformed||h.solution||h.diagnosis||h.rootCause||h.remarks||'No work summary recorded'} · {h.status||'—'}</div></div>)}</div>:<div style={{fontSize:12,color:'#92400e'}}>No previous job-card work found for this bike.</div>}</div>
      <div style={{padding:'0 16px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><label className="form-field"><span>Priority</span><select value={ownJobForm.priority} onChange={e=>setOwnJobForm(f=>({...f,priority:e.target.value}))}><option>NORMAL</option><option>LOW</option><option>HIGH</option><option>URGENT</option></select></label><label className="form-field"><span>Service type</span><select value={ownJobForm.serviceType} onChange={e=>setOwnJobForm(f=>({...f,serviceType:e.target.value}))}><option>STAFF_CREATED_SERVICE</option><option>REPAIR</option><option>GENERAL_SERVICE</option><option>INSPECTION</option></select></label><label className="form-field" style={{gridColumn:'1/-1'}}><span>Problem / work requested</span><textarea rows="3" value={ownJobForm.problem} onChange={e=>setOwnJobForm(f=>({...f,problem:e.target.value}))} placeholder="Describe the customer problem or requested work…"/></label><label className="form-field" style={{gridColumn:'1/-1'}}><span>Staff notes</span><textarea rows="2" value={ownJobForm.notes} onChange={e=>setOwnJobForm(f=>({...f,notes:e.target.value}))}/></label></div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'0 16px 16px'}}><button className="btn-ghost" onClick={()=>setOwnJobOpen(false)} disabled={ownCreateBusy}>Cancel</button><button className="btn-primary" onClick={createOwnJobCard} disabled={ownCreateBusy}>{ownCreateBusy?'Creating & starting…':'✓ Create & Start Work'}</button></div>
    </div></div>}

    {historyModal && (
      <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.62)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
        <div style={{background:'#fff',borderRadius:18,width:'min(820px,100%)',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 80px rgba(0,0,0,.35)'}}>
          <div style={{padding:'18px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:11,fontWeight:800,color:'#64748b',letterSpacing:'.08em'}}>VEHICLE SERVICE HISTORY</div><h3 style={{margin:'3px 0 0'}}>📚 {historyModal.bikeId || 'Bike'} — Previous Work</h3></div><button onClick={()=>setHistoryModal(null)} style={{border:0,background:'#f1f5f9',borderRadius:9,padding:'8px 12px',cursor:'pointer'}}>✕</button></div>
          <div style={{padding:20}}>
            {!historyModal.previousJobs?.length ? <div style={{padding:28,textAlign:'center',color:'#64748b'}}>No previous repair/service history was found for this bike.</div> : historyModal.previousJobs.map((j,i)=>{const r=j.proof?.report||{},m=j.maintenance||{};return <div key={j._id} style={{border:'1px solid #e2e8f0',borderRadius:14,padding:15,marginBottom:12,background:i===0?'#f8fafc':'#fff'}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><b>{j.serviceType||m.type||'SERVICE'}</b><div style={{fontSize:11,color:'#64748b',marginTop:3}}>{j.completedAt?new Date(j.completedAt).toLocaleString('en-IN'):'Completed date —'} · Staff: {j.technicianId?.name||m.staffCompletedByName||'—'}</div></div><span style={{fontSize:11,fontWeight:800,color:'#166534',background:'#dcfce7',padding:'4px 9px',borderRadius:99}}>{j.status}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12,fontSize:12}}><div><b>Problem</b><br/>{j.problem||r.issue||'—'}</div><div><b>Diagnosis</b><br/>{j.diagnosis||r.diagnosis||'—'}</div><div><b>Work performed</b><br/>{j.workPerformed||r.workPerformed||r.completionSummary||'—'}</div><div><b>Solution</b><br/>{j.solution||r.solution||m.staffCompletionSummary||'—'}</div><div><b>Parts</b><br/>{(j.partsReplaced||r.partsReplaced||[]).join?.(', ')||'—'}</div><div><b>Test result</b><br/>{j.testResult||r.testResult||'—'}</div><div><b>Final condition</b><br/>{j.finalCondition||r.finalCondition||'—'}</div><div><b>Recommendations</b><br/>{j.recommendations||r.recommendations||'—'}</div></div>{j.pauseHistory?.length>0&&<div style={{marginTop:10,padding:10,background:'#fffbeb',borderRadius:9,fontSize:11}}><b>Pause history:</b> {j.pauseHistory.map((p,k)=><span key={k}> {p.reason} ({p.durationSeconds||0}s){k<j.pauseHistory.length-1?',':''}</span>)}</div>}</div>})}
          </div>
        </div>
      </div>
    )}

    {/* ── Pause Reason Modal ── */}
    {pauseModal && (() => {
      const DEFAULT_PAUSE_REASONS = [
        'Waiting for spare part',
        'Taking a break',
        'Customer approval needed',
        'Tool/equipment unavailable',
        'Waiting for colleague',
        'Power/electricity issue',
        'Weather conditions',
      ];
      const allReasons = [...DEFAULT_PAUSE_REASONS, ...customPauseReasons];
      const isOther = pauseReasonSelected === '__other__';
      const canConfirm = isOther ? pauseCustomInput.trim().length > 0 : pauseReasonSelected.length > 0;
      return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:'min(460px,100%)',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{fontWeight:800,fontSize:17,marginBottom:4,color:'#92400e'}}>⏸ Pause Work</div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>
              🚗 {pauseModal.bikeId||pauseModal.commandVehicleId?.bikeId||'Bike'} · {pauseModal.vehicleMake||pauseModal.commandVehicleId?.make||''} {pauseModal.vehicleModel||pauseModal.commandVehicleId?.model||''} · {pauseModal.vehicleReg||pauseModal.commandVehicleId?.registrationNo||'—'}
            </div>
            <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#78350f'}}>
              ⚠️ Your pause reason will be sent to the franchisee and the customer.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700}}>Pause category<select value={pauseDetails.category} onChange={e=>setPauseDetails(x=>({...x,category:e.target.value}))} style={{display:'block',width:'100%',marginTop:5,padding:'9px',border:'1px solid #fde68a',borderRadius:8}}><option value="">Select category</option><option>Parts</option><option>Approval</option><option>Equipment</option><option>Customer</option><option>Safety</option><option>Other</option></select></label>
              <label style={{fontSize:12,fontWeight:700}}>Expected resume<input type="datetime-local" value={pauseDetails.expectedResumeAt} onChange={e=>setPauseDetails(x=>({...x,expectedResumeAt:e.target.value}))} style={{display:'block',width:'100%',marginTop:5,padding:'8px',border:'1px solid #fde68a',borderRadius:8}}/></label>
            </div>
            <label style={{display:'block',fontSize:12,fontWeight:700,marginBottom:10}}>Work completed before pause<textarea rows={2} value={pauseDetails.workCompletedBeforePause} onChange={e=>setPauseDetails(x=>({...x,workCompletedBeforePause:e.target.value}))} placeholder="What did you finish before pausing?" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:'9px',border:'1px solid #fde68a',borderRadius:8,resize:'vertical'}}/></label>
            <label style={{display:'block',fontSize:12,fontWeight:700,marginBottom:10}}>Parts / materials required after resume<input value={pauseDetails.partsRequired} onChange={e=>setPauseDetails(x=>({...x,partsRequired:e.target.value}))} placeholder="e.g. brake pad, cable" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:'9px',border:'1px solid #fde68a',borderRadius:8}}/></label>
            <label style={{display:'block',fontSize:12,fontWeight:700,marginBottom:14}}>Pause details<textarea rows={2} value={pauseDetails.details} onChange={e=>setPauseDetails(x=>({...x,details:e.target.value}))} placeholder="Additional explanation for Command Center and future staff" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:'9px',border:'1px solid #fde68a',borderRadius:8,resize:'vertical'}}/></label>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:6}}>Why are you pausing? *</label>
              <select
                value={pauseReasonSelected}
                onChange={e => { setPauseReasonSelected(e.target.value); setPauseCustomInput(''); }}
                style={{width:'100%',padding:'10px 12px',border:'1.5px solid #fde68a',borderRadius:8,fontSize:13,boxSizing:'border-box',background:'#fffbeb',color: pauseReasonSelected?'#1e293b':'#94a3b8',marginBottom:8}}
                autoFocus
              >
                <option value="">— Select a reason —</option>
                {allReasons.map((r,i) => <option key={i} value={r}>{r}</option>)}
                <option value="__other__">Other (type your own reason)</option>
              </select>
              {isOther && (
                <input
                  type="text"
                  value={pauseCustomInput}
                  onChange={e => setPauseCustomInput(e.target.value)}
                  placeholder="Type your pause reason…"
                  style={{width:'100%',padding:'10px 12px',border:'1.5px solid #fde68a',borderRadius:8,fontSize:13,boxSizing:'border-box',marginTop:4}}
                  autoFocus
                />
              )}
              {isOther && pauseCustomInput.trim() && (
                <div style={{fontSize:11,color:'#78350f',marginTop:4}}>💡 This reason will be saved for quick selection next time.</div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button
                onClick={confirmPause}
                disabled={!canConfirm}
                style={{flex:1,background:'#d97706',color:'#fff',border:'none',borderRadius:8,padding:'11px',cursor:canConfirm?'pointer':'not-allowed',fontWeight:700,fontSize:14,opacity:canConfirm?1:0.5}}
              >⏸ Confirm Pause</button>
              <button
                onClick={() => { setPauseModal(null); setPauseReasonText(''); setPauseReasonSelected(''); setPauseCustomInput(''); setPauseDetails({category:'',details:'',expectedResumeAt:'',workCompletedBeforePause:'',partsRequired:''}); }}
                style={{background:'#f1f5f9',color:'#374151',border:'none',borderRadius:8,padding:'11px 18px',cursor:'pointer',fontWeight:600,fontSize:13}}
              >Cancel</button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* Remarks Modal */}
    {remarksModal && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{background:'#fff',borderRadius:16,padding:24,width:'min(480px,100%)',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>✅ Mark Work as Completed</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>
            ⏱ Total time: <b>{fmtElapsed(remarksModal.elapsedSeconds||0)}</b>
          </div>

          {/* Summary of work done */}
          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:12,marginBottom:14,fontSize:13}}>
            <div style={{fontWeight:700,marginBottom:6}}>Job Summary</div>
            <div><b>Vehicle:</b> {remarksModal.vehicleMake || remarksModal.vehicleId?.make || ''} {remarksModal.vehicleModel || remarksModal.vehicleId?.model || ''} · {remarksModal.vehicleReg || remarksModal.vehicleId?.registrationNo || '—'}</div>
            <div><b>Problem:</b> {remarksModal.problem}</div>
            <div><b>Work Assigned:</b> {remarksModal.description}</div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:6}}>Work Remarks / What was done *</label>
            <textarea
              rows={4}
              value={remarksText}
              onChange={e => setRemarksText(e.target.value)}
              placeholder="Describe what you did, parts replaced, issues found, etc…"
              style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,resize:'vertical',boxSizing:'border-box'}}
            />
            <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>These remarks will be sent to the franchisee as job card details.</div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <button
              onClick={submitRemarks}
              disabled={!remarksText.trim()}
              style={{flex:1,background:'#16a34a',color:'#fff',border:'none',borderRadius:8,padding:'11px',cursor:'pointer',fontWeight:700,fontSize:14,opacity:remarksText.trim()?1:0.5}}
            >✅ Submit &amp; Complete</button>
            <button
              onClick={() => setRemarksModal(null)}
              style={{background:'#f1f5f9',color:'#374151',border:'none',borderRadius:8,padding:'11px 18px',cursor:'pointer',fontWeight:600,fontSize:13}}
            >Cancel</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Completion Proof Modal ── */}
    {false && proofModal && (() => {
      const jc = proofModal;
      const bikeId = jc.bikeId || jc.commandVehicleId?.bikeId || jc.vehicleSnapshot?.bikeId || '';
      const canSubmit = proofForm.remarks.trim() && proofForm.odometerReading.trim() && proofForm.batteryPercent.trim();
      const battVal = Number(proofForm.batteryPercent);
      const battInvalid = proofForm.batteryPercent && (battVal < 0 || battVal > 100);
      return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:'min(500px,100%)',boxShadow:'0 20px 60px rgba(0,0,0,.3)',maxHeight:'90vh',overflowY:'auto'}}>
            {/* Header */}
            <div style={{fontWeight:800,fontSize:17,marginBottom:2,color:'#15803d'}}>✅ Complete Job — Proof Required</div>
            <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>
              🔋 Bike ID: <b>{bikeId||'—'}</b> · Chassis / VIN: <b>{jc.commandVehicleId?.chassisNo||jc.vehicleSnapshot?.chassisNo||'—'}</b> · {jc.vehicleMake||jc.commandVehicleId?.make||''} {jc.vehicleModel||jc.commandVehicleId?.model||''} · {jc.vehicleReg||jc.commandVehicleId?.registrationNo||'—'}
            </div>

            {/* Job Summary */}
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:12,marginBottom:16,fontSize:13}}>
              <div style={{fontWeight:700,marginBottom:5,color:'#15803d'}}>📋 Job Summary</div>
              <div><b>Problem:</b> {jc.problem||'—'}</div>
              <div><b>Work Assigned:</b> {jc.description||jc.workDescription||'—'}</div>
              <div><b>Time Spent:</b> {(()=>{const s=getLiveElapsed(jc);const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=s%60;return h?`${h}h ${m}m`:`${m}m ${sec}s`;})()}</div>
            </div>

            {/* Odometer Reading */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>
                📍 Current Odometer Reading (km) *
              </label>
              <input
                type="number"
                min="0"
                value={proofForm.odometerReading}
                onChange={e => setProofForm(f => ({...f, odometerReading: e.target.value}))}
                placeholder="e.g. 12450"
                style={{width:'100%',padding:'10px 12px',border:'1.5px solid #bbf7d0',borderRadius:8,fontSize:13,boxSizing:'border-box'}}
              />
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Actual reading from the bike's odometer at time of completion — stored against Bike ID <b>{bikeId||'—'}</b>.</div>
            </div>

            {/* Battery Percentage */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>
                🔋 Current Battery Percentage (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={proofForm.batteryPercent}
                onChange={e => setProofForm(f => ({...f, batteryPercent: e.target.value}))}
                placeholder="e.g. 78"
                style={{width:'100%',padding:'10px 12px',border:`1.5px solid ${battInvalid?'#f87171':'#bbf7d0'}`,borderRadius:8,fontSize:13,boxSizing:'border-box'}}
              />
              {battInvalid && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>⚠️ Must be between 0 and 100.</div>}
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Battery charge level observed at job completion — stored against Bike ID <b>{bikeId||'—'}</b>.</div>
            </div>

            {/* Work Remarks */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:5}}>
                📝 Work Remarks / What was done *
              </label>
              <textarea
                rows={4}
                value={proofForm.remarks}
                onChange={e => setProofForm(f => ({...f, remarks: e.target.value}))}
                placeholder="Describe what you did, parts replaced, tests performed, observations…"
                style={{width:'100%',padding:'10px 12px',border:'1.5px solid #bbf7d0',borderRadius:8,fontSize:13,resize:'vertical',boxSizing:'border-box'}}
              />
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Sent to franchisee as completion proof. Be specific.</div>
            </div>

            {/* Detailed service report */}
            <div style={{marginBottom:16,padding:14,border:'1px solid #e2e8f0',borderRadius:12,background:'#f8fafc'}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:10}}>🔧 Detailed Service Report</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['diagnosis','Diagnosis / issue found','e.g. rear brake pad worn'],['rootCause','Root cause','e.g. pad wear from prolonged use'],['workPerformed','Work performed','e.g. removed, cleaned and replaced brake pad'],['solution','Final solution','What fixed the issue?'],['testResult','Test / verification result','e.g. road test passed, brakes normal'],['finalCondition','Final vehicle condition','e.g. safe and ready for handover'],['recommendations','Recommendations','Anything customer/fleet should monitor'],['labourHours','Labour hours','e.g. 1.5']].map(([key,label,ph])=><label key={key} style={{fontSize:12,fontWeight:700,color:'#334155'}}>{label}<input type={key==='labourHours'?'number':'text'} step={key==='labourHours'?'0.1':undefined} value={proofForm[key]} onChange={e=>setProofForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:12}}/></label>)}
              </div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#334155',marginTop:10}}>Parts replaced / materials used<textarea rows={2} value={proofForm.partsReplaced} onChange={e=>setProofForm(f=>({...f,partsReplaced:e.target.value}))} placeholder="Brake pad, cable, bolt… one per line or comma separated" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:12,resize:'vertical'}}/></label>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#334155',marginTop:10}}>Next service date<input type="date" value={proofForm.nextServiceAt} onChange={e=>setProofForm(f=>({...f,nextServiceAt:e.target.value}))} style={{display:'block',marginTop:5,padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:12}}/></label>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#334155',marginTop:10}}>Completion notes<textarea rows={3} value={proofForm.completionNotes} onChange={e=>setProofForm(f=>({...f,completionNotes:e.target.value}))} placeholder="Final notes for Command Center, franchisee and future staff" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:12,resize:'vertical'}}/></label>
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:10}}>
              <button
                onClick={submitProofAndComplete}
                disabled={!canSubmit || battInvalid}
                style={{flex:1,background:'#15803d',color:'#fff',border:'none',borderRadius:8,padding:'12px',cursor:(canSubmit&&!battInvalid)?'pointer':'not-allowed',fontWeight:700,fontSize:14,opacity:(canSubmit&&!battInvalid)?1:0.5}}
              >✅ Submit Proof &amp; Mark Complete</button>
              <button
                onClick={() => { setProofModal(null); setProofForm({ remarks:'', odometerReading:'', batteryPercent:'', diagnosis:'', rootCause:'', workPerformed:'', solution:'', partsReplaced:'', testResult:'', finalCondition:'', recommendations:'', nextServiceAt:'', labourHours:'', completionNotes:'' }); }}
                style={{background:'#f1f5f9',color:'#374151',border:'none',borderRadius:8,padding:'12px 18px',cursor:'pointer',fontWeight:600,fontSize:13}}
              >Cancel</button>
            </div>
          </div>
        </div>
      );
    })()}

    {jobCardEditor && <DigitalJobCardModal job={jobCardEditor.job} mode={jobCardEditor.mode} call={call} user={user} onClose={()=>setJobCardEditor(null)} onCreated={(created)=>{setJobCards(prev=>[created,...prev.filter(x=>(x._id||x.id)!==(created._id||created.id))]);}} onCompleted={()=>{fetchMyJobCards();setJobCardEditor(null);}} />}
    {completedJobCardViewer && <StaffCompletedJobCardViewer job={completedJobCardViewer} call={call} onClose={()=>setCompletedJobCardViewer(null)} />}

  </>;
}


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

function Holidays({ setPage }) {
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
    <PageHeader title={`${t('holidaysTitle')} ${currentYear}`} sub={t('publicRegionalHolidays')} back={() => setPage && setPage('dashboard')} />

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
function Leave({ user, call, setPage }) {
  const [leaves, setLeaves] = useState(() => store.get('ev_staff_leaves') || []);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  useEffect(() => { let alive=true; if(!call)return; setLoadingLeaves(true); call('/staff/leave-requests').then(rows=>{ if(!alive)return; const mapped=(rows||[]).map(r=>({ ...r, id:r._id, type:String(r.leaveType||'CASUAL').toLowerCase(), fromDate:r.startDate, toDate:r.endDate, appliedOn:r.createdAt, staffId:r.userId })); setLeaves(mapped); store.set('ev_staff_leaves',mapped); }).catch(()=>{}).finally(()=>alive&&setLoadingLeaves(false)); return()=>{alive=false}; }, [user?._id, user?.id]);
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

  const submitLeave = async () => {
    if (!form.fromDate || !form.toDate || !form.reason) return;
    try {
      const row = await call('/staff/leave-requests', { method:'post', data:{ leaveType:form.type.toUpperCase(), startDate:form.fromDate, endDate:form.toDate, reason:form.reason } });
      const newLeave = { ...row, id:row._id, type:String(row.leaveType||form.type).toLowerCase(), fromDate:row.startDate||form.fromDate, toDate:row.endDate||form.toDate, days:row.days||calcDays(form.fromDate,form.toDate), status:row.status||'PENDING', appliedOn:row.createdAt||new Date().toISOString(), staffName:user?.name||'Staff', staffId:user?._id||user?.id };
      const updated=[newLeave,...leaves]; setLeaves(updated); store.set('ev_staff_leaves',updated);
      setForm({type:'casual',fromDate:'',toDate:'',reason:'',contactDuring:'',emergencyContact:''}); setSubmitted(true); setShowForm(false); setTab('history'); setTimeout(()=>setSubmitted(false),4000);
    } catch(e) { alert(e.response?.data?.message||e.message||'Could not submit leave'); }
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

  const cancelLeave = async id => { try { await call(`/staff/leave-requests/${id}/cancel`,{method:'put'}); const updated=leaves.map(l=>l.id===id&&l.status==='PENDING'?{...l,status:'CANCELLED'}:l); setLeaves(updated); store.set('ev_staff_leaves',updated); } catch(e){ alert(e.response?.data?.message||e.message||'Could not cancel leave'); } };

  const pending  = leaves.filter(l => l.status === 'PENDING').length;
  const approved = leaves.filter(l => l.status === 'APPROVED').length;
  const taken    = leaves.filter(l => l.status === 'APPROVED').reduce((s,l) => s + (l.days||0), 0);

  return <>
    <PageHeader title="Leave Management" sub="Apply for leave and track approvals." back={() => setPage && setPage('dashboard')} />

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
        <button className={'works-tab'+(tab==='balance'?' active':'')} onClick={() => setTab('balance')}>Balance</button><button className={'works-tab'+(tab==='calendar'?' active':'')} onClick={() => setTab('calendar')}>Calendar</button>
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

    {tab === 'calendar' && (() => {
      const y=new Date().getFullYear(), m=new Date().getMonth(); const first=new Date(y,m,1).getDay(); const count=new Date(y,m+1,0).getDate(); const cells=[]; for(let i=0;i<first;i++)cells.push(<span key={'e'+i}/>); for(let d=1;d<=count;d++){const key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const hit=leaves.find(l=>l.status==='APPROVED'&&key>=String(l.fromDate).slice(0,10)&&key<=String(l.toDate).slice(0,10)); cells.push(<span key={d} className={'leave-calendar-day'+(hit?' leave':'')+(key===new Date().toISOString().slice(0,10)?' today':'')}>{d}</span>)} return <div className="feature-card leave-calendar-card"><div className="feature-card-head"><b>{new Date(y,m).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</b><span>Approved leave days</span></div><div className="leave-week-head">{['S','M','T','W','T','F','S'].map((x,i)=><span key={i}>{x}</span>)}</div><div className="leave-calendar-grid">{cells}</div><div className="calendar-legend"><span><i className="legend-dot leave"/> Approved leave</span><span><i className="legend-dot today"/> Today</span></div></div> })()}

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
function Profile({ user, setUser, setPage }) {
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

  useEffect(() => {
    document.body.classList.toggle('staff-dark', Boolean(profile.settings?.darkMode));
    return () => document.body.classList.remove('staff-dark');
  }, [profile.settings?.darkMode]);

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

  const works = store.get('ev_staff_works') || [];
  const leaves = store.get('ev_staff_leaves') || [];
  const completed = works.filter(w => w.status === 'completed').length;
  const displayName = profile.name || user?.name || 'Staff';
  const role = String(user?.role || 'STAFF').toUpperCase();

  const FieldVal = ({ value }) => value
    ? <div className="profile-field-val">{value}</div>
    : <div className="profile-field-val"><span className="profile-not-set">Not set</span></div>;

  return <div className="premium-profile-page">
    <PageHeader title="My Profile" sub="Manage your personal details and preferences." back={() => setPage && setPage('dashboard')} />

    {saved && <div className="success-toast">✅ Profile saved successfully!</div>}

    <div className="profile-layout premium-profile-layout">
      <section className="profile-photo-card premium-profile-hero">
        <div className="premium-profile-hero-top">
          <div className="profile-avatar-wrap premium-avatar-wrap">
            {profile.profilePic
              ? <img src={profile.profilePic} alt="Profile" className="profile-avatar-img" />
              : <div className="profile-avatar-default">{displayName[0]}</div>
            }
            <button className="photo-upload-btn" onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
          </div>

          <div className="profile-name-block premium-profile-identity">
            <div className="profile-display-name">{displayName}</div>
            <div className="profile-role-badge">{role}</div>
            {user?.hubId && <div className="profile-hub"><MapPin size={11}/> <span>{user.hubId}</span></div>}
            <div className="profile-account-status"><span /> Active account</div>
          </div>

          <button className="premium-profile-edit" onClick={() => setActiveTab('personal')}>
            <Settings size={14}/> Manage
          </button>
        </div>

        <div className="profile-quick-stats premium-profile-stats">
          <div className="pqs-item"><div className="pqs-val">{works.length}</div><div className="pqs-label">Works</div></div>
          <div className="pqs-item"><div className="pqs-val">{leaves.length}</div><div className="pqs-label">Leaves</div></div>
          <div className="pqs-item"><div className="pqs-val">{completed}</div><div className="pqs-label">Completed</div></div>
        </div>
      </section>

      <div className="profile-details premium-profile-details">
        <div className="profile-tabs premium-profile-tabs">
          {TAB_LABELS.map(([id, label, Icon]) => (
            <button key={id} className={'prof-tab'+(activeTab===id?' active':'')} onClick={() => setActiveTab(id)}>
              <span className="prof-tab-icon"><Icon size={15}/></span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'personal' && (
          <div className="card premium-profile-card">
            <div className="card-head premium-card-head">
              <div>
                <div className="card-title">Personal Information</div>
                <div className="premium-card-subtitle">Your basic profile and contact details</div>
              </div>
              <span className="premium-section-chip"><User size={12}/> Personal</span>
            </div>
            <div className="work-form-grid premium-profile-fields">
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
            <div className="premium-profile-save-row">
              <span><ShieldCheck size={13}/> Changes are stored securely on this device.</span>
              <button className="premium-btn" onClick={save}>Save Changes</button>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card premium-profile-card">
            <div className="card-head premium-card-head">
              <div>
                <div className="card-title">Identity Documents</div>
                <div className="premium-card-subtitle">Your verified identity information</div>
              </div>
              <span className="premium-section-chip"><ShieldCheck size={12}/> Secure</span>
            </div>
            <div className="doc-fields premium-doc-fields">
              {[
                { key:'aadhaar', label:'Aadhaar Number', icon:'🪪', mask: v => v ? v.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '' },
                { key:'pan', label:'PAN Card', icon:'💳', mask: v => v },
              ].map(({ key, label, icon, mask }) => (
                <div key={key} className="doc-field-card premium-doc-card">
                  <div className="dfc-icon">{icon}</div>
                  <div className="dfc-body"><div className="dfc-label">{label}</div><div className="dfc-val">{profile[key] ? mask(profile[key]) : <span className="profile-not-set">Not added</span>}</div></div>
                  {profile[key] && <span className="dfc-verified"><Check size={12}/></span>}
                </div>
              ))}
            </div>
            <div className="doc-privacy-note premium-privacy-note"><ShieldCheck size={13}/> Your document information remains protected and is not shared without consent.</div>
          </div>
        )}

        {activeTab === 'address' && (
          <div className="card premium-profile-card">
            <div className="card-head premium-card-head">
              <div>
                <div className="card-title">Address Details</div>
                <div className="premium-card-subtitle">Your current residential address</div>
              </div>
              <span className="premium-section-chip"><Home size={12}/> Address</span>
            </div>
            <div className="work-form-grid premium-profile-fields">
              <div className="form-field full"><label>Street Address</label><FieldVal value={profile.address} /></div>
              {[['city','City'],['state','State'],['pincode','PIN Code']].map(([k,l]) => <div key={k} className="form-field"><label>{l}</label><FieldVal value={profile[k]} /></div>)}
            </div>
            <div className="premium-address-note"><MapPin size={15}/><div><strong>Address on file</strong><span>Keep your residential information up to date for official communication.</span></div></div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card premium-profile-card">
            <div className="card-head premium-card-head">
              <div><div className="card-title">App Settings</div><div className="premium-card-subtitle">Personalize your Staff Portal experience</div></div>
              <span className="premium-section-chip"><Settings size={12}/> Preferences</span>
            </div>
            <div className="settings-list premium-settings-list">
              <div className="setting-row premium-setting-row"><div className="premium-setting-icon blue"><Bell size={16}/></div><div className="premium-setting-copy"><div className="setting-label">Push Notifications</div><div className="setting-sub">Get alerts for job updates and leave status</div></div><button className={'toggle-btn'+(profile.settings.notifications?' on':'')} onClick={() => { updSettings('notifications', !profile.settings.notifications); save(); }}><div className="toggle-knob" /></button></div>
              <div className="setting-row premium-setting-row"><div className="premium-setting-icon indigo"><Moon size={16}/></div><div className="premium-setting-copy"><div className="setting-label">Dark Mode</div><div className="setting-sub">Use a darker interface at night</div></div><button className={'toggle-btn'+(profile.settings.darkMode?' on':'')} onClick={() => { updSettings('darkMode', !profile.settings.darkMode); save(); }}><div className="toggle-knob" /></button></div>
              <div className="setting-row premium-setting-row"><div className="premium-setting-icon green"><Globe2 size={16}/></div><div className="premium-setting-copy"><div className="setting-label">Language</div><div className="setting-sub">Interface language</div></div><select value={profile.settings.language} className="settings-select" onChange={e => { updSettings('language', e.target.value); if(setLang) setLang(e.target.value); save(); }}><option value="en">English</option><option value="ta">Tamil</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="kn">Kannada</option></select></div>
              <div className="setting-row premium-setting-row"><div className="premium-setting-icon orange"><Type size={16}/></div><div className="premium-setting-copy"><div className="setting-label">Font Size</div><div className="setting-sub">Adjust text size for readability</div></div><select value={profile.settings.fontSize} className="settings-select" onChange={e => { updSettings('fontSize', e.target.value); save(); }}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════
// STAFF PORTAL V3 — CONNECTED FEATURES
// ══════════════════════════════════════════════════════════════════
function MobileBack({ setPage }) { return <button className="mobile-back-btn" onClick={() => setPage('dashboard')}><ChevronLeft size={20}/><span>Back</span></button>; }

function FeatureHeader({ title, sub, setPage, Icon=Activity, action }) {
  return <div className="feature-header"><div className="feature-header-left"><MobileBack setPage={setPage}/><div className="feature-title-icon"><Icon size={20}/></div><div><h1>{title}</h1></div></div>{action}</div>;
}

function useStaffLive(call, path, interval=20000) {
  const [data,setData]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{try{const d=await call(path);setData(d||[]);setError('')}catch(e){setError(e.response?.data?.message||e.message||'Unable to load')}finally{setLoading(false)}};
  useEffect(()=>{load();const id=setInterval(load,interval);return()=>clearInterval(id)},[path]); return {data,loading,error,refresh:load};
}

function NotificationsCenter({call,user,setPage}) {
  const {data,loading,refresh}=useStaffLive(call,'/staff/notifications',15000); const [local,setLocal]=useState([]);
  useEffect(()=>setLocal(data||[]),[data]);
  useEffect(()=>{
    const id=user?._id||user?.id; if(!id)return;
    const socket=io((API||window.location.origin).replace(/\/api\/?$/,''),{transports:['websocket','polling']});
    socket.on('connect',()=>socket.emit('auth:user',id));
    socket.on('notification:new',n=>{setLocal(prev=>[n,...prev].slice(0,200));});
    return()=>socket.disconnect();
  },[user]);

  useEffect(()=>{try{localStorage.setItem('ev_staff_notifications',JSON.stringify(local))}catch(_){}} ,[local]);
  const unread=local.filter(n=>!n.read).length;
  const mark=async n=>{setLocal(x=>x.map(v=>String(v._id)===String(n._id)?{...v,read:true}:v));try{await call(`/staff/notifications/${n._id}/read`,{method:'put'})}catch(_){}};
  const all=async()=>{setLocal(x=>x.map(n=>({...n,read:true})));try{await call('/staff/notifications/read-all',{method:'put'})}catch(_){} };
  return <><FeatureHeader title="Notifications" sub={unread?`${unread} unread`:'All caught up'} setPage={setPage} Icon={Bell} action={unread>0?<button className="premium-btn ghost" onClick={all}>Mark all read</button>:null}/><div className="feature-stack">{loading&&<Loader/>}{!loading&&!local.length&&<div className="premium-empty"><Bell size={28}/><b>No notifications</b><span>Updates from Command Center and your work will appear here.</span></div>}{local.map(n=><button key={n._id} className={'notification-card'+(!n.read?' unread':'')} onClick={()=>mark(n)}><span className="notification-icon">{n.data?.banner?<Megaphone size={18}/>:<Bell size={18}/>}</span><span className="notification-body"><strong>{n.title}</strong><span>{n.message}</span><small>{new Date(n.createdAt).toLocaleString('en-IN')}</small></span>{!n.read&&<i/>}</button>)}</div></>;
}

function AttendanceDuty({call,user,setPage}) {
  const {data,loading,refresh}=useStaffLive(call,'/staff/attendance',30000);
  const today=data?.[0];
  const [clock,setClock]=useState(new Date());
  const [busy,setBusy]=useState(false);
  const [showAllLogs,setShowAllLogs]=useState(false);

  useEffect(()=>{
    const id=setInterval(()=>setClock(new Date()),1000);
    return()=>clearInterval(id);
  },[]);

  const locate=()=>new Promise(resolve=>{
    if(!navigator.geolocation)return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
      ()=>resolve(null),
      {enableHighAccuracy:true,timeout:7000}
    );
  });

  const act=async type=>{
    setBusy(true);
    try{
      const location=await locate();
      await call(`/staff/attendance/${type}`,{method:'post',data:location?{location}:{}});
      await refresh();
    }catch(e){
      alert(e.response?.data?.message||e.message);
    }finally{
      setBusy(false);
    }
  };

  const active=!!(today?.clockIn&&!today?.clockOut);
  const breaks=Array.isArray(today?.breaks)?today.breaks:[];
  const onBreak=breaks.length>0&&!breaks[breaks.length-1].endedAt;

  const breakSeconds=(a,now=new Date())=>(Array.isArray(a)?a:[]).reduce((sum,b)=>{
    const start=b.startedAt?new Date(b.startedAt).getTime():0;
    const end=b.endedAt?new Date(b.endedAt).getTime():now.getTime();
    return sum+(start&&end>start?Math.floor((end-start)/1000):0);
  },0);

  const workedSeconds=(a,now=new Date())=>{
    if(!a?.clockIn)return 0;
    const end=a.clockOut?new Date(a.clockOut):now;
    const gross=Math.max(0,Math.floor((end-new Date(a.clockIn))/1000));
    return Math.max(0,gross-breakSeconds(a?.breaks,now));
  };

  const fmtDuration=seconds=>{
    const s=Math.max(0,Number(seconds)||0);
    const h=Math.floor(s/3600);
    const m=Math.floor((s%3600)/60);
    return `${h}h ${String(m).padStart(2,'0')}m`;
  };
  const fmtTime=value=>value?new Date(value).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—';
  const SHIFT_SECONDS=(9*60+30)*60;

  const y=clock.getFullYear(), m=clock.getMonth();
  const monthPrefix=`${y}-${String(m+1).padStart(2,'0')}`;
  const monthData=(data||[]).filter(a=>String(a.dateKey||'').startsWith(monthPrefix));
  const presentDays=monthData.filter(a=>a.clockIn).length;
  const lateMinutes=monthData.reduce((sum,a)=>sum+(Number(a.lateMinutes)||0),0);
  const workedMonthSeconds=monthData.reduce((sum,a)=>sum+workedSeconds(a,a.clockOut?new Date(a.clockOut):clock),0);
  const avgWorked=presentDays?Math.round(workedMonthSeconds/presentDays):0;

  const dateKeyFor=(date)=>{
    const yy=date.getFullYear();
    const mm=String(date.getMonth()+1).padStart(2,'0');
    const dd=String(date.getDate()).padStart(2,'0');
    return `${yy}-${mm}-${dd}`;
  };
  const attMap=new Map((data||[]).map(a=>[String(a.dateKey||''),a]));
  const todayKey=dateKeyFor(clock);

  let streak=0;
  for(let i=0;i<31;i++){
    const d=new Date(clock);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-i);
    const a=attMap.get(dateKeyFor(d));
    if(a?.clockIn) streak++;
    else break;
  }

  const week=[];
  for(let i=6;i>=0;i--){
    const d=new Date(clock);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-i);
    const a=attMap.get(dateKeyFor(d));
    week.push({
      date:d,
      key:dateKeyFor(d),
      item:a,
      worked:a?workedSeconds(a,a.clockOut?new Date(a.clockOut):clock):0
    });
  }
  const weekMax=Math.max(SHIFT_SECONDS,...week.map(x=>x.worked));
  const currentWorked=workedSeconds(today,clock);
  const shiftProgress=Math.min(100,Math.round((currentWorked/SHIFT_SECONDS)*100));
  const remaining=Math.max(0,SHIFT_SECONDS-currentWorked);

  const firstDay=new Date(y,m,1).getDay();
  const monthDays=new Date(y,m+1,0).getDate();
  const cal=[];
  for(let i=0;i<firstDay;i++)cal.push(<span key={'blank'+i} className="attendance-day blank"/>);
  for(let d=1;d<=monthDays;d++){
    const key=`${monthPrefix}-${String(d).padStart(2,'0')}`;
    const a=attMap.get(key);
    const future=d>clock.getDate();
    const state=a?.clockIn?(a.lateMinutes>0?'late':'present'):(future?'future':'absent');
    cal.push(
      <span key={d} className={'attendance-day '+state+(d===clock.getDate()?' today':'')}>
        {d}{d===clock.getDate()&&<i/>}
      </span>
    );
  }

  const logs=showAllLogs?(data||[]):(data||[]).slice(0,7);
  const exportReport=()=>{
    const rows=[
      ['Date','Clock In','Clock Out','Break','Worked','Late Minutes'],
      ...(data||[]).map(a=>[
        a.dateKey||'',
        fmtTime(a.clockIn),
        fmtTime(a.clockOut),
        fmtDuration(breakSeconds(a,a.clockOut?new Date(a.clockOut):clock)),
        fmtDuration(workedSeconds(a,a.clockOut?new Date(a.clockOut):clock)),
        Number(a.lateMinutes)||0
      ])
    ];
    const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`attendance-${monthPrefix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <FeatureHeader
      title="Attendance & Duty"
      sub={clock.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
      setPage={setPage}
      Icon={Clock}
      action={<button className="premium-btn ghost attendance-export-btn" onClick={exportReport}><Download size={14}/> Export</button>}
    />

    <div className="attendance-command-card">
      <div className="attendance-command-glow"/>
      <div className="attendance-command-top">
        <div>
          <span className="attendance-eyebrow"><span className={active?'attendance-live-pulse':''}/>{active?'LIVE DUTY':'DUTY STATUS'}</span>
          <h2>{active?'You are on duty':'You are off duty'}</h2>
          <p>{active?'Your attendance is being tracked for today.':'Start your duty when you are ready to begin your shift.'}</p>
        </div>
        <div className="attendance-clock-orb">
          <Clock size={18}/>
          <strong>{clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</strong>
          <span>{clock.toLocaleTimeString('en-IN',{second:'2-digit'})}</span>
        </div>
      </div>
      <div className="attendance-command-bottom">
        <div className="attendance-start-info">
          <span>Today's session</span>
          <strong>{today?.clockIn?fmtTime(today.clockIn):'Not started'}</strong>
          <small>{today?.clockOut?`Finished at ${fmtTime(today.clockOut)}`:active?'Session in progress':'Clock in to begin'}</small>
        </div>
        <button className={'attendance-main-action '+(active?'danger':'')} onClick={()=>act(active?'clock-out':'clock-in')} disabled={busy}>
          <span className="attendance-action-icon">{active?<LogOut size={18}/>:<Clock size={18}/>}</span>
          <span>{busy?'Updating…':active?'Clock out':'Clock in'}</span>
          <ChevronRight size={16}/>
        </button>
      </div>
    </div>

    <div className="attendance-kpi-grid">
      <div className="attendance-kpi"><span className="attendance-kpi-icon blue"><Calendar size={17}/></span><div><b>{presentDays}</b><small>Days present</small></div><em>This month</em></div>
      <div className="attendance-kpi"><span className="attendance-kpi-icon green"><Timer size={17}/></span><div><b>{fmtDuration(avgWorked)}</b><small>Avg. work day</small></div><em>Net time</em></div>
      <div className="attendance-kpi"><span className="attendance-kpi-icon amber"><AlertTriangle size={17}/></span><div><b>{lateMinutes}m</b><small>Late minutes</small></div><em>Month total</em></div>
      <div className="attendance-kpi"><span className="attendance-kpi-icon violet"><TrendingUp size={17}/></span><div><b>{streak}</b><small>Day streak</small></div><em>Current</em></div>
    </div>

    <div className="attendance-primary-grid">
      <div className="feature-card attendance-today-card">
        <div className="attendance-section-head">
          <div><b>Today's duty</b><span>{today?.dateKey||todayKey}</span></div>
          <span className={'attendance-status-pill '+(onBreak?'break':active?'working':'offline')}>
            <i/>{onBreak?'On break':active?'Working':'Off duty'}
          </span>
        </div>

        <div className="attendance-progress-area">
          <div className="attendance-progress-copy">
            <span>Shift progress</span>
            <strong>{fmtDuration(currentWorked)}</strong>
            <small>{active?`${fmtDuration(remaining)} remaining to reach 9h 30m`:'Target: 9h 30m net work'}</small>
          </div>
          <div className="attendance-progress-ring" style={{'--progress':`${shiftProgress*3.6}deg`}}>
            <div><b>{shiftProgress}%</b><span>complete</span></div>
          </div>
        </div>

        <div className="attendance-time-strip">
          <div><span>Clock in</span><b>{fmtTime(today?.clockIn)}</b></div>
          <div><span>Breaks</span><b>{breaks.length}</b></div>
          <div><span>Clock out</span><b>{fmtTime(today?.clockOut)}</b></div>
        </div>

        <button className="attendance-break-btn" onClick={()=>act('break')} disabled={!active}>
          {onBreak?<><Check size={15}/> End current break</>:<><Coffee size={15}/> Start a break</>}
        </button>

        {today?.location&&<div className="attendance-location"><span><Navigation size={14}/></span><div><b>Work location recorded</b><small>Accuracy ±{Math.round(today.location.accuracy||0)}m</small></div><CheckCircle size={15}/></div>}
      </div>

      <div className="feature-card attendance-week-card">
        <div className="attendance-section-head">
          <div><b>Last 7 days</b><span>Net working time</span></div>
          <span className="attendance-target-label">9h 30m target</span>
        </div>
        <div className="attendance-week-chart">
          {week.map(x=>{
            const pct=x.worked?Math.max(8,Math.min(100,Math.round((x.worked/weekMax)*100))):4;
            const isToday=x.key===todayKey;
            return <div className={'attendance-week-bar '+(isToday?'today':'')} key={x.key}>
              <span className="attendance-bar-value">{x.worked?fmtDuration(x.worked):'—'}</span>
              <div className="attendance-bar-track"><i style={{height:`${pct}%`}}/></div>
              <b>{x.date.toLocaleDateString('en-IN',{weekday:'short'}).slice(0,2)}</b>
              <small>{x.date.getDate()}</small>
            </div>;
          })}
        </div>
        <div className="attendance-week-note"><span><i className="attendance-note-dot"/> Worked</span><span><i className="attendance-note-line"/> Daily target</span></div>
      </div>
    </div>

    <div className="attendance-secondary-grid">
      <div className="feature-card attendance-calendar-card">
        <div className="attendance-section-head">
          <div><b>{clock.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</b><span>Attendance calendar</span></div>
          <div className="attendance-calendar-summary"><b>{presentDays}</b><small>present</small></div>
        </div>
        <div className="attendance-week-head">{['S','M','T','W','T','F','S'].map((d,i)=><span key={i}>{d}</span>)}</div>
        <div className="attendance-calendar-grid">{cal}</div>
        <div className="calendar-legend">
          <span><i className="legend-dot attendance-present"/> Present</span>
          <span><i className="legend-dot attendance-late"/> Late</span>
          <span><i className="legend-dot attendance-absent"/> Absent</span>
        </div>
      </div>

      <div className="feature-card attendance-timeline-card">
        <div className="attendance-section-head">
          <div><b>Today's timeline</b><span>Duty activity</span></div>
          {breaks.length>0&&<span className="attendance-mini-count">{breaks.length} break{breaks.length>1?'s':''}</span>}
        </div>
        <div className="attendance-timeline">
          <div className="attendance-timeline-item done"><span className="attendance-timeline-dot"><Clock size={12}/></span><div><b>Clock in</b><small>{fmtTime(today?.clockIn)}</small></div></div>
          {breaks.map((br,i)=><div className={'attendance-timeline-item '+(!br.endedAt?'active':'done')} key={i}><span className="attendance-timeline-dot"><Coffee size={12}/></span><div><b>{br.endedAt?'Break completed':'Break in progress'}</b><small>{fmtTime(br.startedAt)}{br.endedAt?` → ${fmtTime(br.endedAt)}`:''}</small></div></div>)}
          <div className={'attendance-timeline-item '+(today?.clockOut?'done':'pending')}><span className="attendance-timeline-dot"><LogOut size={12}/></span><div><b>Clock out</b><small>{today?.clockOut?fmtTime(today.clockOut):'Pending'}</small></div></div>
        </div>
        {!today?.clockIn&&<div className="attendance-timeline-empty"><Clock size={17}/><span>Clock in to start today's timeline.</span></div>}
      </div>
    </div>

    <div className="feature-card attendance-logs-card">
      <div className="attendance-section-head">
        <div><b>Recent duty logs</b><span>{data?.length||0} attendance records</span></div>
        <button className="attendance-view-btn" onClick={()=>setShowAllLogs(v=>!v)}>{showAllLogs?'Show recent':'View all'} <ChevronRight size={13}/></button>
      </div>
      <div className="attendance-log-list">
        {loading&&<Loader/>}
        {!loading&&!logs.length&&<div className="duty-log-empty">No duty logs yet.</div>}
        {!loading&&logs.map(a=>{
          const worked=workedSeconds(a,a.clockOut?new Date(a.clockOut):clock);
          const breaksTotal=breakSeconds(a,a.clockOut?new Date(a.clockOut):clock);
          const isActive=!a.clockOut&&a.clockIn;
          const status=a.lateMinutes>0?'Late':isActive?'Active':worked>=SHIFT_SECONDS?'Complete':'Short';
          return <div className="attendance-log-row" key={a._id||a.dateKey}>
            <div className="attendance-log-date"><b>{a.dateKey?new Date(`${a.dateKey}T00:00:00`).getDate():'—'}</b><span>{a.dateKey?new Date(`${a.dateKey}T00:00:00`).toLocaleDateString('en-IN',{month:'short'}):'—'}</span></div>
            <div className="attendance-log-main"><strong>{fmtTime(a.clockIn)} <span>→</span> {a.clockOut?fmtTime(a.clockOut):'Active'}</strong><small>{fmtDuration(worked)} net · {fmtDuration(breaksTotal)} breaks</small></div>
            <span className={'attendance-log-status '+status.toLowerCase()}>{status}</span>
          </div>;
        })}
      </div>
    </div>
  </>;
}
function DailyChecklist({call,setPage}) { const {data,loading,refresh}=useStaffLive(call,'/staff/checklists',30000); const [rows,setRows]=useState([]); useEffect(()=>setRows(data||[]),[data]); const toggle=async(row,i)=>{const items=row.items.map((x,k)=>k===i?{...x,done:!x.done}:x);setRows(r=>r.map(x=>x._id===row._id?{...x,items}:x));try{await call(`/staff/checklists/${row._id}`,{method:'put',data:{items,title:row.title}})}catch(_){refresh()}}; return <><FeatureHeader title="Daily Checklist" sub="Complete your required work items" setPage={setPage} Icon={ClipboardCheck}/><div className="feature-stack">{loading&&<Loader/>}{!loading&&!rows.length&&<div className="premium-empty"><ClipboardCheck size={28}/><b>No checklist assigned</b><span>Your daily checklist will appear when Command Center assigns one.</span></div>}{rows.map(r=><div className="feature-card" key={r._id}><div className="feature-card-head"><b>{r.title||'Today’s checklist'}</b><span>{r.items.filter(i=>i.done).length}/{r.items.length}</span></div>{r.items.map((item,i)=><button className={'check-row'+(item.done?' done':'')} key={i} onClick={()=>toggle(r,i)}><span>{item.done?<CheckCircle size={20}/>:<span className="check-box"/>}</span><span>{item.label}</span></button>)}</div>)}</div></> }

function DocumentsVault({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/documents',60000); const docs=data||[]; return <><FeatureHeader title="Documents" sub="Your secure staff document vault" setPage={setPage} Icon={FileText}/><div className="doc-vault-grid">{loading&&<Loader/>}{!loading&&!docs.length&&<div className="premium-empty"><FileText size={28}/><b>No documents yet</b><span>HR and Command Center documents will appear here.</span></div>}{docs.map(d=><a className="vault-doc-card" href={d.url||'#'} target="_blank" rel="noreferrer" key={d._id}><span className="vault-doc-icon"><FileText size={22}/></span><strong>{d.title}</strong><small>{d.type||'Document'}</small><span className="doc-open"><Download size={14}/> Open</span></a>)}</div></> }

function Payslips({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/payslips',60000); const rows=data||[]; const money=v=>`₹${Number(v||0).toLocaleString('en-IN')}`; return <><FeatureHeader title="Payslips" sub="Salary statements and take-home history" setPage={setPage} Icon={CircleDollarSign}/>{!rows.length&&!loading?<div className="premium-empty"><CircleDollarSign size={28}/><b>No payslips published</b><span>Your monthly salary statements will appear here.</span></div>:<div className="payslip-grid">{rows.map(p=><div className="payslip-card" key={p._id}><div className="payslip-top"><div><small>{p.month}</small><strong>{money(p.net)}</strong></div><span>NET TAKE-HOME</span></div><div className="salary-lines"><span>Gross <b>{money(p.gross)}</b></span>{Object.entries(p.earnings||{}).slice(0,3).map(([k,v])=><span key={k}>{k}<b>{money(v)}</b></span>)}{Object.entries(p.deductions||{}).slice(0,3).map(([k,v])=><span key={k}>{k}<b>− {money(v)}</b></span>)}</div>{p.url?<a className="premium-btn ghost full" href={p.url} target="_blank" rel="noreferrer"><Download size={15}/> Download</a>:<span className="published-pill">Published</span>}</div>)}</div>}</> }

function SupportTickets({call,setPage}) { const {data,loading,refresh}=useStaffLive(call,'/staff/support',30000); const [open,setOpen]=useState(false); const [form,setForm]=useState({category:'TECHNICAL',subject:'',description:'',priority:'NORMAL'}); const [reply,setReply]=useState({}); const submit=async()=>{if(!form.subject||!form.description)return;await call('/staff/support',{method:'post',data:form});setForm({category:'TECHNICAL',subject:'',description:'',priority:'NORMAL'});setOpen(false);refresh()}; const sendReply=async(id)=>{if(!reply[id])return;await call(`/staff/support/${id}/messages`,{method:'post',data:{message:reply[id]}});setReply(r=>({...r,[id]:''}));refresh()}; return <><FeatureHeader title="Support" sub="Raise and track staff requests" setPage={setPage} Icon={MessageSquare} action={<button className="premium-btn" onClick={()=>setOpen(true)}><Plus size={15}/> New request</button>}/><div className="support-category-grid">{[['TECHNICAL','Technical',Settings],['HR','HR & People',UserCheck],['PAYROLL','Payroll',CircleDollarSign],['OPERATIONS','Operations',Briefcase]].map(([key,label,Icon])=><button key={key} className={'support-category '+(form.category===key?'active':'')} onClick={()=>{setForm({...form,category:key});setOpen(true)}}><span><Icon size={19}/></span><b>{label}</b><small>Raise {label.toLowerCase()} request</small></button>)}</div>{open&&<div className="feature-card"><div className="feature-card-head"><b>Raise a request</b><button className="icon-btn" onClick={()=>setOpen(false)}><X size={17}/></button></div><div className="form-field"><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>TECHNICAL</option><option>HR</option><option>PAYROLL</option><option>OPERATIONS</option><option>GENERAL</option></select></div><div className="form-field"><label>Subject</label><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></div><div className="form-field"><label>Details</label><textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><button className="premium-btn full" onClick={submit}><Send size={15}/> Submit request</button></div>}<div className="feature-stack">{loading&&<Loader/>}{!loading&&!data?.length&&<div className="premium-empty"><MessageSquare size={28}/><b>No support tickets</b><span>Need help? Create your first request.</span></div>}{(data||[]).map(t=><div className="ticket-card" key={t._id}><div className="ticket-head"><span>#{t.ticketNo}</span><em>{t.status}</em></div><strong>{t.subject}</strong><p>{t.description}</p><div className="ticket-thread">{(t.messages||[]).slice(-4).map((m,i)=><div key={i} className={m.senderRole=== 'STAFF'?'mine':'theirs'}><b>{m.senderRole}</b><span>{m.message}</span></div>)}</div><div className="ticket-reply"><input placeholder="Reply…" value={reply[t._id]||''} onChange={e=>setReply(r=>({...r,[t._id]:e.target.value}))}/><button onClick={()=>sendReply(t._id)}><Send size={15}/></button></div></div>)}</div></> }


function StaffCompletedJobCardViewer({job,call,onClose}) {
  const [card,setCard]=useState(job?.jobCard||null);
  const [loading,setLoading]=useState(!job?.jobCard);
  useEffect(()=>{let alive=true;const id=job?._id||job?.id;if(!id)return;call(`/staff/jobs/${id}/job-card`).then(x=>{if(alive)setCard(x)}).catch(()=>{}).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[job?._id||job?.id]);
  const data=card?.jobCardData||{};
  const customer=data.customer||job?.customerId||job?.customerSnapshot||{};
  const vehicle=data.vehicle||job?.vehicleSnapshot||job?.commandVehicleId||job?.bikeDetails||{};
  const fmt=d=>d?new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const display=v=>v===undefined||v===null||v===''?'—':typeof v==='boolean'?(v?'Yes':'No'):Array.isArray(v)?(v.length?v.map((x,i)=>typeof x==='object'?JSON.stringify(x):String(x)).join(', '):'—'):typeof v==='object'?JSON.stringify(v):String(v);
  const Field=({label,value})=><div style={{padding:'9px 11px',border:'1px solid #e2e8f0',borderRadius:9,background:'#f8fafc'}}><div style={{fontSize:10,color:'#64748b',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</div><div style={{fontSize:12,fontWeight:650,color:'#0f172a',marginTop:3,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{display(value)}</div></div>;
  const ObjectFields=({obj,exclude=[]})=><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8}}>{Object.entries(obj||{}).filter(([k])=>!exclude.includes(k)).map(([k,v])=><Field key={k} label={k.replace(/([A-Z])/g,' $1').replace(/_/g,' ')} value={v}/>)}</div>;
  return <div className="modal-overlay" onClick={onClose}><div className="modal-drawer" onClick={e=>e.stopPropagation()} style={{width:'min(980px,100%)',maxHeight:'94vh',display:'flex',flexDirection:'column'}}>
    <div className="modal-head"><div><div className="modal-title">Completed Job Card</div><div className="modal-subtitle">{card?.jobCardNumber||`JC-${String(job?._id||'').slice(-8).toUpperCase()}`} · Completed {fmt(card?.completedAt||job?.completedAt)}</div></div><button className="icon-btn" onClick={onClose}>✕</button></div>
    <div className="modal-body" style={{overflowY:'auto'}}>
      {loading?<div style={{padding:40,textAlign:'center',color:'#64748b'}}>Loading complete job card…</div>:<div style={{display:'grid',gap:14}}>
        <section style={{padding:14,border:'1px solid #dbeafe',borderRadius:14,background:'#eff6ff'}}><div style={{fontWeight:850,fontSize:13,color:'#1d4ed8',marginBottom:9}}>Customer Details</div><ObjectFields obj={customer}/></section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Vehicle Details</div><ObjectFields obj={vehicle}/></section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Vehicle Receipt Condition</div><ObjectFields obj={data.receipt||card?.vehicleReceiptCondition}/></section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Service / Job Details</div><ObjectFields obj={data.service||card?.serviceTypeData}/><div style={{marginTop:10}}><Field label="Customer Complaint / Voice" value={card?.complaint||job?.problem||data.serviceLines?.map(x=>x.customerVoice).filter(Boolean).join('\n')}/></div></section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Service Lines</div>{Array.isArray(data.serviceLines)&&data.serviceLines.length?<div style={{display:'grid',gap:8}}>{data.serviceLines.map((x,i)=><div key={i} style={{padding:11,border:'1px solid #e2e8f0',borderRadius:10}}><b style={{fontSize:12}}>Service Item {i+1}</b><ObjectFields obj={x}/></div>)}</div>:<div style={{color:'#64748b',fontSize:12}}>No service-line entries.</div>}</section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Estimate</div><ObjectFields obj={data.estimate||card?.estimateData}/></section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Acknowledgement</div><ObjectFields obj={data.acknowledgement}/></section>
        <section style={{padding:14,border:'1px solid #e2e8f0',borderRadius:14}}><div style={{fontWeight:850,fontSize:13,marginBottom:9}}>Authorization & Notes</div><Field label="Authorization" value={data.authorizationText||card?.authorizationText}/><div style={{marginTop:8}}><Field label="Notes" value={data.notes||job?.remarks||card?.technicianNotes}/></div></section>
        <section style={{padding:14,border:'1px solid #bbf7d0',borderRadius:14,background:'#f0fdf4'}}><div style={{fontWeight:850,fontSize:13,color:'#166534',marginBottom:9}}>Acknowledgement / Completion</div><ObjectFields obj={{Job_Card_Number:card?.jobCardNumber,Customer_Approval:card?.customerApproval,Customer_Signature_At:fmt(card?.customerSignatureAt),Submitted_At:fmt(card?.submittedAt),Completed_At:fmt(card?.completedAt)}}/>{card?.customerSignature&&<div style={{marginTop:10}}><div style={{fontSize:10,color:'#64748b',fontWeight:700,textTransform:'uppercase'}}>Customer Signature</div><img src={card.customerSignature} alt="Customer signature" style={{marginTop:6,maxWidth:300,maxHeight:110,objectFit:'contain',background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:6}}/></div>}</section>
      </div>}
    </div><div className="modal-footer"><button className="btn-ghost" onClick={onClose}>Close</button></div>
  </div></div>;
}

function StaffPerformance({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/performance',60000); const p=data||{}; return <><FeatureHeader title="Performance" sub="Your work and attendance snapshot" setPage={setPage} Icon={TrendingUp}/><div className="performance-hero"><div><small>Completion rate</small><strong>{p.completionRate||0}%</strong></div><div className="progress-ring"><span>{p.completedJobs||0}</span><small>completed</small></div></div><div className="mini-stat-grid"><div><b>{p.totalJobs||0}</b><span>Total jobs</span></div><div><b>{p.completedJobs||0}</b><span>Completed</span></div><div><b>{p.attendanceRate||0}%</b><span>Attendance</span></div><div><b>{p.presentDays||0}</b><span>Present days</span></div></div></> }

function ShiftSchedule({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/shifts',60000); return <><FeatureHeader title="Shift Schedule" sub="Upcoming duty assignments" setPage={setPage} Icon={Calendar}/><div className="feature-stack">{loading&&<Loader/>}{!loading&&!data?.length&&<div className="premium-empty"><Calendar size={28}/><b>No shifts scheduled</b><span>Your upcoming shift assignments will appear here.</span></div>}{(data||[]).map(s=><div className="shift-card" key={s._id}><div className="shift-date"><b>{new Date(s.dateKey).getDate()}</b><small>{new Date(s.dateKey).toLocaleDateString('en-IN',{month:'short'})}</small></div><div><strong>{s.startTime} – {s.endTime}</strong><span>{s.location||'Assigned duty area'}</span></div><em>{s.status}</em></div>)}</div></> }

function StaffRecognition({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/recognition',60000); return <><FeatureHeader title="Recognition" sub="Achievements and appreciation" setPage={setPage} Icon={Award}/><div className="recognition-grid">{loading&&<Loader/>}{!loading&&!data?.length&&<div className="premium-empty"><Award size={28}/><b>No recognitions yet</b><span>Appreciation from Command Center will appear here.</span></div>}{(data||[]).map(r=><div className="recognition-card" key={r._id}><span><BadgeCheck size={26}/></span><div><strong>{r.title}</strong><p>{r.description}</p><small>{r.badge||'Achievement'} · {new Date(r.awardedAt).toLocaleDateString('en-IN')}</small></div></div>)}</div></> }


function GlobalSearch({call,setPage}) { const [q,setQ]=useState(''); const {data:jobs}=useStaffLive(call,'/staff/jobs',60000); const {data:notifs}=useStaffLive(call,'/staff/notifications',60000); const {data:tickets}=useStaffLive(call,'/staff/support',60000); const query=q.trim().toLowerCase(); const groups=[['Jobs',jobs||[],j=>`${j.serviceType||''} ${j.problem||''} ${j._id||''}`, 'my-works'],['Notifications',notifs||[],j=>`${j.title||''} ${j.message||''}`,'notifications'],['Tickets',tickets||[],j=>`${j.ticketNo||''} ${j.subject||''}`,'support']]; const results=groups.flatMap(([name,arr,fn,page])=>arr.filter(x=>!query||fn(x).toLowerCase().includes(query)).slice(0,8).map(x=>({name,x,page}))); return <><FeatureHeader title="Search" sub="Find jobs, notifications and support tickets" setPage={setPage} Icon={Search}/><div className="search-box"><Search size={18}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by job, ticket, message…"/></div><div className="search-results">{!results.length?<div className="premium-empty"><Search size={28}/><b>No matches</b><span>Try a job ID, ticket number or keyword.</span></div>:results.map((r,i)=><button key={i} className="search-result" onClick={()=>setPage(r.page)}><span>{r.name}</span><strong>{r.x.title||r.x.subject||r.x.serviceType||r.x.ticketNo||'Result'}</strong><small>{r.x.message||r.x.problem||r.x.description||''}</small></button>)}</div></> }

function SecurityPage({call,setPage}) { const [form,setForm]=useState({currentPassword:'',newPassword:'',confirm:''}); const [busy,setBusy]=useState(false); const submit=async()=>{if(form.newPassword!==form.confirm)return alert('New passwords do not match');setBusy(true);try{await call('/auth/change-password',{method:'post',data:{currentPassword:form.currentPassword,newPassword:form.newPassword}});setForm({currentPassword:'',newPassword:'',confirm:''});alert('Password changed successfully')}catch(e){alert(e.response?.data?.message||e.message)}finally{setBusy(false)}}; return <><FeatureHeader title="Security" sub="Protect your staff account" setPage={setPage} Icon={ShieldCheck}/><div className="feature-card security-card"><div className="security-banner"><ShieldCheck size={26}/><div><b>Account security</b><span>Change your password regularly and keep your account private.</span></div></div><div className="form-field"><label>Current password</label><input type="password" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})}/></div><div className="form-field"><label>New password</label><input type="password" minLength="6" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/></div><div className="form-field"><label>Confirm new password</label><input type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></div><button className="premium-btn" disabled={busy} onClick={submit}>{busy?'Updating…':'Change password'}</button></div></> }

// ══════════════════════════════════════════════════════════════════
// STAFF CHARGE HUBS
// ══════════════════════════════════════════════════════════════════

const STAFF_HUB_STATUS_COLOR = { ONLINE: '#16a34a', OFFLINE: '#dc2626', MAINTENANCE: '#d97706' };

const STAFF_CITY_COORDS = {
  'hyderabad':  [17.3850,  78.4867], 'bangalore':  [12.9716,  77.5946],
  'bengaluru':  [12.9716,  77.5946], 'mumbai':     [19.0760,  72.8777],
  'delhi':      [28.6139,  77.2090], 'new delhi':  [28.6139,  77.2090],
  'chennai':    [13.0827,  80.2707], 'kolkata':    [22.5726,  88.3639],
  'pune':       [18.5204,  73.8567], 'ahmedabad':  [23.0225,  72.5714],
  'jaipur':     [26.9124,  75.7873], 'lucknow':    [26.8467,  80.9462],
  'surat':      [21.1702,  72.8311], 'kochi':      [ 9.9312,  76.2673],
  'vizag':      [17.6868,  83.2185], 'visakhapatnam': [17.6868, 83.2185],
  'nagpur':     [21.1458,  79.0882], 'indore':     [22.7196,  75.8577],
  'coimbatore': [11.0168,  76.9558], 'vadodara':   [22.3072,  73.1812],
  'patna':      [25.5941,  85.1376], 'bhopal':     [23.2599,  77.4126],
  'thane':      [19.2183,  72.9781], 'noida':      [28.5355,  77.3910],
  'gurgaon':    [28.4595,  77.0266], 'gurugram':   [28.4595,  77.0266],
  'chandigarh': [30.7333,  76.7794], 'mysore':     [12.2958,  76.6394],
  'mysuru':     [12.2958,  76.6394], 'bhubaneswar':[20.2961,  85.8245],
  'kurnool':    [15.8281,  78.0373], 'vijayawada': [16.5062,  80.6480],
  'guntur':     [16.3067,  80.4365], 'tirupati':   [13.6288,  79.4192],
  'warangal':   [17.9784,  79.5941], 'nellore':    [14.4426,  79.9865],
  'rajkot':     [22.3039,  70.8022], 'amritsar':   [31.6340,  74.8723],
  'jodhpur':    [26.2389,  73.0243], 'guwahati':   [26.1445,  91.7362],
  'agra':       [27.1767,  78.0081], 'varanasi':   [25.3176,  82.9739],
};

function staffGetCoords(hub) {
  if (hub.lat && hub.lng) return [hub.lat, hub.lng];
  const key = (hub.city || '').toLowerCase().trim();
  return STAFF_CITY_COORDS[key] || null;
}

async function staffGeocodeHub(hub) {
  const q = [hub.address, hub.city, 'India'].filter(Boolean).join(', ');
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await r.json();
    if (data && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (_) {}
  return null;
}

function StaffHubMap({ hubs, selectedHub, onSelectHub }) {
  const mapRef = React.useRef(null);
  const leafRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const drawTokenRef = React.useRef(0);

  React.useEffect(() => {
    if (leafRef.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true, preferCanvas: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19, updateWhenIdle: true, keepBuffer: 2,
    }).addTo(map);
    map.getPane('markerPane').style.zIndex = 650;
    delete window.L.Icon.Default.prototype._getIconUrl;
    window.L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' });
    leafRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
  }, []);

  React.useEffect(() => {
    const map = leafRef.current;
    if (!map) return;
    const token = ++drawTokenRef.current;
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch (_) {} });
    markersRef.current = [];
    const list = Array.isArray(hubs) ? hubs : [];
    const seenCoords = new Set();
    const coordsList = list.map(h => ({ hub: h, coords: staffGetCoords(h) })).filter(x => {
      if (!x.coords) return false;
      const key = `${Number(x.coords[0]).toFixed(6)},${Number(x.coords[1]).toFixed(6)}`;
      if (seenCoords.has(key)) return false;
      seenCoords.add(key);
      return true;
    });
    if (!coordsList.length) return;
    const bounds = coordsList.map(x => x.coords);
    if (bounds.length === 1) map.setView(bounds[0], 15, { animate: false });
    else map.fitBounds(window.L.latLngBounds(bounds), { padding: [35, 35], maxZoom: 13, animate: false });
    map.invalidateSize();
    let i = 0;
    const drawBatch = () => {
      if (token !== drawTokenRef.current) return;
      const end = Math.min(i + 50, coordsList.length);
      for (; i < end; i++) placeStaffMarker(map, coordsList[i].hub, coordsList[i].coords, i + 1);
      if (i < coordsList.length) requestAnimationFrame(drawBatch);
    };
    requestAnimationFrame(drawBatch);
  }, [hubs]);

  function placeStaffMarker(map, hub, coords, number) {
    const color = STAFF_HUB_STATUS_COLOR[hub.status] || '#2563eb';
    const icon = window.L.divIcon({
      className: '',
      html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:2px solid ${color};box-shadow:0 2px 9px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font-size:19px;line-height:1;">⚡</div>`,
      iconSize: [34,34], iconAnchor: [17,17], popupAnchor: [0,-17]
    });
    const marker = window.L.marker(coords, { icon, pane: 'markerPane' }).addTo(map);
    const lat = Number(coords && coords[0]);
    const lng = Number(coords && coords[1]);
    const mapsUrl = Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
      : '';
    const detail = [
      `<strong>${String(hub.name || hub.hubName || `Location ${number}`)}</strong>`,
      hub.city ? `City: ${String(hub.city)}` : '',
      hub.area || hub.locality ? `Area: ${String(hub.area || hub.locality)}` : '',
      hub.address || hub.fullAddress ? `Address: ${String(hub.address || hub.fullAddress)}` : '',
      hub.status ? `Status: ${String(hub.status)}` : '',
      (hub.swaps !== undefined && hub.swaps !== null && hub.swaps !== '') ? `Swaps: ${String(hub.swaps)}` : '',
      mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="hub-google-maps-link" style="display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:7px 10px;border-radius:8px;background:#2563eb;color:#fff!important;text-decoration:none;font-weight:700;font-size:12px;">📍 Open in Google Maps</a>` : ''
    ].filter(Boolean).join('<br/>');
    marker.bindPopup(detail, { closeButton: true, autoPan: false, maxWidth: 320 });
    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
    marker.on('click', (e) => {
      if (e && e.originalEvent) e.originalEvent.stopPropagation();
      marker.openPopup();
      onSelectHub(hub);
    });
    markersRef.current.push(marker);
  }

  return <div className="hub-map-container" style={{ position: 'relative' }}>
    <div ref={mapRef} id="staff-hub-map" style={{ height: 480, borderRadius: 12, overflow: 'hidden' }} />
    <div className="map-legend" style={{pointerEvents:'none'}}>
      {Object.entries(STAFF_HUB_STATUS_COLOR).map(([s, c]) => <div key={s} className="legend-item"><div className="legend-dot" style={{ background: c }} /><span style={{ fontSize: 11, color: '#374151' }}>{s}</span></div>)}
    </div>
  </div>;
}


const __HUB_NUMBER_STYLE = (() => { if (typeof document !== 'undefined' && !document.getElementById('hub-number-style')) { const st=document.createElement('style'); st.id='hub-number-style'; st.textContent='.hub-map-number{background:transparent!important;border:0!important;box-shadow:none!important;color:#fff!important;font-weight:900!important;font-size:10px!important;line-height:1!important;text-align:center!important;text-shadow:0 1px 2px rgba(0,0,0,.45)!important;padding:0!important;}'; document.head.appendChild(st); } return null; })();

function StaffChargeHubs({ call, setPage }) {
  const { data: hubs, loading, error } = useFetch(call, '/hubs');
  const [selectedHub,  setSelectedHub]  = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter,   setCityFilter]   = useState('ALL');
  const [areaFilter,   setAreaFilter]   = useState('ALL');
  const [hubSearch,    setHubSearch]    = useState('');
  const [viewMode,     setViewMode]     = useState('map');

  if (loading && !hubs) return <Loader />;
  if (error   && !hubs) return <div className="empty-state"><p style={{color:'#dc2626'}}>{error}</p></div>;

  const hubList = hubs || [];
  const cityOptions = [...new Set(hubList.map(h => String(h.city || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const areaOptions = [...new Set(hubList
    .filter(h => cityFilter === 'ALL' || String(h.city || '').trim() === cityFilter)
    .map(h => String(h.area || h.region || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const filtered = hubList.filter(h =>
    (statusFilter === 'ALL' || h.status === statusFilter) &&
    (cityFilter === 'ALL' || String(h.city || '').trim() === cityFilter) &&
    (areaFilter === 'ALL' || String(h.area || h.region || '').trim() === areaFilter) &&
    (!hubSearch || [h.name,h.code,h.city,h.area,h.region,h.address,h.siteType,h.sourceId].join(' ').toLowerCase().includes(hubSearch.trim().toLowerCase()))
  );
  const onlineCount  = hubList.filter(h => h.status === 'ONLINE').length;
  const offlineCount = hubList.filter(h => h.status === 'OFFLINE').length;
  const maintCount   = hubList.filter(h => h.status === 'MAINTENANCE').length;
  const totalChargers = hubList.reduce((s, h) => s + (h.chargerCount || 0), 0);

  const STATUS_CFG = {
    ONLINE:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Online'      },
    OFFLINE:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Offline'     },
    MAINTENANCE: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Maintenance' },
  };

  return (
    <>
      <PageHeader title="Charge Hubs" sub={`${hubList.length} hubs across the allEV network · ${totalChargers} total charger slots`} back={() => setPage && setPage('dashboard')} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Total Hubs',    value: hubList.length,  color: '#2563eb' },
          { label: 'Online',        value: onlineCount,     color: '#16a34a' },
          { label: 'Offline',       value: offlineCount,    color: '#dc2626' },
          { label: 'Maintenance',   value: maintCount,      color: '#d97706' },
          { label: 'Charger Slots', value: totalChargers,   color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #e4e7ef', borderRadius: 12,
            padding: '10px 18px', flex: '1 1 120px', minWidth: 100,
            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Location controls — filter the same shared /hubs dataset used by Customer and Franchisee. */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background:'#fff', border:'1px solid #e4e7ef', borderRadius:10, padding:10, marginBottom:12 }}>
        <div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 220px'}}>
          <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>📍 Location</span>
          <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setAreaFilter('ALL'); }} style={{flex:1,minWidth:150,padding:'7px 9px',border:'1px solid #dfe3eb',borderRadius:7,fontSize:12}}>
            <option value="ALL">All Cities</option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 250px'}}>
          <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>Area</span>
          <select value={areaFilter} onChange={e => { setAreaFilter(e.target.value); if(e.target.value !== 'ALL') setViewMode('map'); }} style={{flex:1,minWidth:170,padding:'7px 9px',border:'1px solid #dfe3eb',borderRadius:7,fontSize:12}}>
            <option value="ALL">All Areas / Regions</option>
            {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <input value={hubSearch} onChange={e=>setHubSearch(e.target.value)} placeholder="Search hub, area, address…" style={{flex:'1 1 220px',minWidth:190,padding:'7px 9px',border:'1px solid #dfe3eb',borderRadius:7,fontSize:12}} />
      </div>

      {/* Status + view controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL',         label: `All (${hubList.length})`,     color: '#2563eb' },
            { id: 'ONLINE',      label: `Online (${onlineCount})`,     color: '#16a34a' },
            { id: 'OFFLINE',     label: `Offline (${offlineCount})`,   color: '#dc2626' },
            { id: 'MAINTENANCE', label: `Maintenance (${maintCount})`, color: '#d97706' },
          ].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: statusFilter === f.id ? `2px solid ${f.color}` : '2px solid #e5e7eb',
              background: statusFilter === f.id ? f.color : '#fff',
              color: statusFilter === f.id ? '#fff' : '#374151',
              transition: 'all .15s',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2, marginLeft: 'auto' }}>
          {[{ id: 'map', icon: '🗺', label: 'Map' }, { id: 'table', icon: '📋', label: 'Table' }].map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: viewMode === v.id ? '#fff' : 'transparent',
              color: viewMode === v.id ? '#2563eb' : '#6b7280',
              boxShadow: viewMode === v.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              transition: 'all .15s',
            }}>{v.icon} {v.label}</button>
          ))}
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">Hub Network Map</span>
            <span className="badge">{filtered.length} hubs</span>
          </div>
          <StaffHubMap hubs={filtered} selectedHub={selectedHub}
            onSelectHub={h => setSelectedHub(s => s?._id === h._id ? null : h)} />
          {selectedHub && (() => {
            const sc = STATUS_CFG[selectedHub.status] || STATUS_CFG.OFFLINE;
            const coords = staffGetCoords(selectedHub);
            const mapsUrl = coords
              ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedHub.address ? selectedHub.address + ', ' : '') + (selectedHub.city || ''))}`;
            return (
              <div style={{
                marginTop: 16, background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 16,
                flexWrap: 'wrap', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1f2e' }}>{selectedHub.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    📍 {selectedHub.city}{selectedHub.address ? ` · ${selectedHub.address}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                    ● {sc.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#374151' }}>⚡ {selectedHub.chargerCount ?? 0} chargers</span>
                  {selectedHub.code && <span style={{ fontSize: 12, color: '#6b7280' }}>🔖 {selectedHub.code}</span>}
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} /> Open Maps
                  </a>
                  <button onClick={() => setSelectedHub(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>✕</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">Hub List</span>
            <span className="badge">{filtered.length} hubs</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📍</div>
              <div className="empty-title">No hubs found for this filter.</div>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Name</th><th>City</th><th>Status</th><th>Chargers</th><th>Code</th><th>Address</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(h => {
                    const sc = STATUS_CFG[h.status] || STATUS_CFG.OFFLINE;
                    const coords  = staffGetCoords(h);
                    const mapsUrl = coords
                      ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((h.address ? h.address + ', ' : '') + (h.city || ''))}`;
                    return (
                      <tr key={h._id}>
                        <td style={{ fontWeight: 600 }}>{h.name || '—'}</td>
                        <td>{h.city || '—'}</td>
                        <td>
                          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            ● {sc.label}
                          </span>
                        </td>
                        <td>{h.chargerCount ?? 0}</td>
                        <td>{h.code || '—'}</td>
                        <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.address || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                               style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={12} /> Maps
                            </a>
                            <button onClick={() => { setSelectedHub(h); setViewMode('map'); }}
                              style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                              📍 Map
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}