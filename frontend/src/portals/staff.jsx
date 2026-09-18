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

// ══════════════════════════════════════════════════════════════════
// MY WORKS — PENDING + COMPLETED + COMPLAINT JOB CARDS
// ══════════════════════════════════════════════════════════════════
function MyWorks({ user, call }) {
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
  const [proofModal, setProofModal] = useState(null);
  const [proofTimeline, setProofTimeline] = useState([]);
  const [proofForm, setProofForm] = useState({notes:'',issue:'',completionSummary:'',photos:[],signatureData:''});
  const [proofRequired, setProofRequired] = useState(false);

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
  const getLiveElapsed = (jc) => {
    if (jc.status === 'IN_PROGRESS' && jc.startedAt && !jc.pausedAt) {
      const base = jc.elapsedSeconds || 0;
      const elapsed = Math.floor((Date.now() - new Date(jc.startedAt).getTime()) / 1000);
      return base + elapsed;
    }
    return jc.elapsedSeconds || 0;
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

  const startWork = (jc) => {
    const id = jc._id || jc.id;
    const resuming = jc.status === 'PAUSED';
    updateJobCard(id, {
      status: 'IN_PROGRESS',
      // On first start use now; on resume keep original startedAt but reset it
      // to now so getLiveElapsed accumulates correctly from saved elapsedSeconds
      startedAt: new Date().toISOString(),
      elapsedSeconds: jc.elapsedSeconds || 0,
      pausedAt: null,
      pauseReason: resuming ? (jc.pauseReason || null) : null,
    });
  };

  // Pause step 1: open reason modal
  const openPauseModal = (jc) => {
    setPauseModal(jc);
    setPauseReasonText('');
  };

  // Pause step 2: confirm with reason → save & notify franchisee + customer
  const confirmPause = () => {
    if (!pauseModal) return;
    const id = pauseModal._id || pauseModal.id;
    const elapsed = getLiveElapsed(pauseModal);
    const reason = pauseReasonText.trim() || 'No reason provided';
    updateJobCard(id, {
      status: 'PAUSED',
      pausedAt: new Date().toISOString(),
      elapsedSeconds: elapsed,
      pauseReason: reason,
    });
    // Notify franchisee via localStorage (franchisee portal reads ev_franchise_job_cards)
    try {
      const stored = JSON.parse(localStorage.getItem('ev_franchise_job_cards') || '[]');
      const updated = stored.map(j =>
        (j.id === id || j.jobId === id)
          ? { ...j, status: 'PAUSED', pauseReason: reason, pausedAt: new Date().toISOString(), elapsedSeconds: elapsed }
          : j
      );
      localStorage.setItem('ev_franchise_job_cards', JSON.stringify(updated));
    } catch (_) {}
    // Notify customer via localStorage (customer portal reads ev_customer_job_updates)
    try {
      const custUpdates = JSON.parse(localStorage.getItem('ev_customer_job_updates') || '[]');
      custUpdates.push({
        jobId: id,
        event: 'PAUSED',
        reason,
        timestamp: new Date().toISOString(),
        vehicleMake: pauseModal.vehicleMake || pauseModal.vehicleId?.make || '',
        vehicleReg: pauseModal.vehicleReg || pauseModal.vehicleId?.registrationNo || '—',
        customerName: pauseModal.customerName || '',
      });
      localStorage.setItem('ev_customer_job_updates', JSON.stringify(custUpdates));
    } catch (_) {}
    setPauseModal(null);
    setPauseReasonText('');
  };

  const markComplete = (jc) => {
    const elapsed = getLiveElapsed(jc);
    // Completion uses the proof/report flow so evidence is captured before closing the job.
    setProofRequired(true);
    setProofModal({ ...jc, elapsedSeconds: elapsed });
    setProofForm({notes:jc.remarks||'',issue:'',completionSummary:jc.remarks||'',photos:[],signatureData:''});
    setProofTimeline([]);
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

  const openProof = async (jc) => {
    try { const proof=await call(`/staff/jobs/${jc._id||jc.id}/timeline`); setProofTimeline(proof?.timeline||[]); setProofRequired(false); setProofModal(jc); setProofForm({notes:proof?.proof?.report?.notes||'',issue:proof?.proof?.report?.issue||'',completionSummary:proof?.proof?.report?.completionSummary||'',photos:proof?.proof?.photos||[],signatureData:proof?.proof?.signatureData||''}); } catch (_) { setProofTimeline([]); setProofRequired(false); setProofModal(jc); }
  };
  const addProofFiles = files => Array.from(files||[]).slice(0,5).forEach(file=>{
    if(file.size>1500000){alert(`${file.name} is larger than 1.5 MB`);return;}
    const r=new FileReader();r.onload=e=>setProofForm(f=>({...f,photos:[...f.photos,{name:file.name,url:e.target.result}].slice(0,5)}));r.readAsDataURL(file)
  });
  const submitProof = async () => {
    if(!proofModal)return;
    if(proofRequired && !proofForm.completionSummary.trim()) return alert('Add a completion summary before completing this job.');
    if(proofRequired && !proofForm.photos.length && !proofForm.signatureData) return alert('Add at least one job photo or customer signature before completing this job.');
    try {
      const id=proofModal._id||proofModal.id;
      await call(`/staff/jobs/${id}/proof`,{method:'post',data:{photos:proofForm.photos,signatureData:proofForm.signatureData,report:{notes:proofForm.notes,issue:proofForm.issue,completionSummary:proofForm.completionSummary}}});
      if(proofRequired){
        const elapsed=proofModal.elapsedSeconds||0, completedAt=new Date().toISOString();
        await updateJobCard(id,{status:'COMPLETED',completedAt,elapsedSeconds:elapsed,remarks:proofForm.completionSummary});
        try { const stored=JSON.parse(localStorage.getItem('ev_franchise_job_cards')||'[]'); localStorage.setItem('ev_franchise_job_cards',JSON.stringify(stored.map(j=>(j.id===id||j.jobId===id)?{...j,status:'COMPLETED',completedAt,elapsedSeconds:elapsed,remarks:proofForm.completionSummary}:j))); } catch(_) {}
        try { const cust=JSON.parse(localStorage.getItem('ev_customer_job_updates')||'[]'); cust.push({jobId:id,event:'COMPLETED',remarks:proofForm.completionSummary,timestamp:completedAt,vehicleMake:proofModal.vehicleMake||proofModal.vehicleId?.make||'',vehicleReg:proofModal.vehicleReg||proofModal.vehicleId?.registrationNo||'—',customerName:proofModal.customerName||''}); localStorage.setItem('ev_customer_job_updates',JSON.stringify(cust)); } catch(_) {}
        setJcTab('completed');
      }
      setProofRequired(false); setProofModal(null); alert(proofRequired?'Job completed with proof':'Job proof saved');
    } catch(e){alert(e.response?.data?.message||e.message)}
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
                      <div style={{fontWeight:800, fontSize:15}}>🚗 {jc.vehicleMake || jc.vehicleId?.make || ''} {jc.vehicleModel || jc.vehicleId?.model || ''}</div>
                      <div style={{fontSize:12, color:'#64748b', marginTop:2}}>Reg: {jc.vehicleReg || jc.vehicleId?.registrationNo || '—'} · Customer: {jc.customerName || jc.customerId?.name || 'Customer'} · {jc.customerPhone || jc.customerId?.phone || '—'}</div>
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
                  {jc.status !== 'COMPLETED' && (
                    <div style={{display:'flex', gap:8}}>
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
                      <button onClick={() => openProof(jc)} style={{
                        background:'#eef2ff', color:'#4338ca', border:'1px solid #c7d2fe', borderRadius:8,
                        padding:'7px 12px', cursor:'pointer', fontWeight:700, fontSize:12,
                      }}>📸 Proof</button>
                      <button onClick={() => markComplete(jc)} style={{
                        background:'#7c3aed', color:'#fff', border:'none', borderRadius:8,
                        padding:'7px 16px', cursor:'pointer', fontWeight:700, fontSize:12,
                      }}>✅ Mark Complete</button>
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

    {/* ── Pause Reason Modal ── */}
    {pauseModal && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{background:'#fff',borderRadius:16,padding:24,width:'min(460px,100%)',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <div style={{fontWeight:800,fontSize:17,marginBottom:4,color:'#92400e'}}>⏸ Pause Work</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>
            🚗 {pauseModal.vehicleMake||''} {pauseModal.vehicleModel||''} · {pauseModal.vehicleReg||'—'}
          </div>
          <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#78350f'}}>
            ⚠️ Your pause reason will be sent to the franchisee and the customer.
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:13,fontWeight:600,display:'block',marginBottom:6}}>Why are you pausing? *</label>
            <textarea
              rows={3}
              value={pauseReasonText}
              onChange={e => setPauseReasonText(e.target.value)}
              placeholder="e.g. Waiting for spare part, taking a break, customer approval needed…"
              style={{width:'100%',padding:'10px 12px',border:'1.5px solid #fde68a',borderRadius:8,fontSize:13,resize:'vertical',boxSizing:'border-box'}}
              autoFocus
            />
          </div>
          <div style={{display:'flex',gap:10}}>
            <button
              onClick={confirmPause}
              disabled={!pauseReasonText.trim()}
              style={{flex:1,background:'#d97706',color:'#fff',border:'none',borderRadius:8,padding:'11px',cursor:'pointer',fontWeight:700,fontSize:14,opacity:pauseReasonText.trim()?1:0.5}}
            >⏸ Confirm Pause</button>
            <button
              onClick={() => { setPauseModal(null); setPauseReasonText(''); }}
              style={{background:'#f1f5f9',color:'#374151',border:'none',borderRadius:8,padding:'11px 18px',cursor:'pointer',fontWeight:600,fontSize:13}}
            >Cancel</button>
          </div>
        </div>
      </div>
    )}

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

    {proofModal && (
      <div className="modal-overlay" onClick={()=>setProofModal(null)}>
        <div className="modal-drawer staff-proof-modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-head"><div><div className="modal-title">{proofRequired ? 'Complete Job' : 'Job Proof & Report'}</div><div className="modal-subtitle">{proofRequired ? 'Add evidence before closing this job' : 'Attach evidence and notes'}</div></div><button className="icon-btn" onClick={()=>setProofModal(null)}><X size={18}/></button></div>
          <div className="modal-body">
            <div className="proof-job-summary"><strong>{proofModal.vehicleMake||proofModal.vehicleId?.make||'Vehicle'} {proofModal.vehicleModel||proofModal.vehicleId?.model||''}</strong><span>{proofModal.vehicleReg||proofModal.vehicleId?.registrationNo||'—'}</span></div>
            <div className="job-timeline">{proofTimeline.map((x,i)=><div key={i} className={'timeline-item'+(x.at?' done':'')}><span></span><div><b>{x.status}</b><small>{x.at?new Date(x.at).toLocaleString('en-IN'):'Pending'}</small></div></div>)}</div>
            <div className="form-field"><label>Completion summary</label><textarea rows="3" value={proofForm.completionSummary} onChange={e=>setProofForm({...proofForm,completionSummary:e.target.value})} placeholder="What was completed?"/></div>
            <div className="form-field"><label>Issue / exception</label><textarea rows="2" value={proofForm.issue} onChange={e=>setProofForm({...proofForm,issue:e.target.value})} placeholder="Any unresolved issue or exception"/></div>
            <div className="form-field"><label>Technician notes</label><textarea rows="3" value={proofForm.notes} onChange={e=>setProofForm({...proofForm,notes:e.target.value})} placeholder="Parts, checks, readings…"/></div>
            <label className="upload-drop"><Upload size={20}/><span><b>Upload job proof</b><small>Photos or documents · up to 5 files</small></span><input type="file" multiple accept="image/*,.pdf" onChange={e=>addProofFiles(e.target.files)}/></label>
            <div className="proof-thumb-row">{proofForm.photos.map((p,i)=><div className="proof-thumb" key={i}>{p.url?.startsWith('data:image')?<img src={p.url} alt=""/>:<FileText size={22}/>}<button onClick={()=>setProofForm(f=>({...f,photos:f.photos.filter((_,k)=>k!==i)}))}>×</button></div>)}</div>
            <SignaturePad value={proofForm.signatureData} onChange={v=>setProofForm({...proofForm,signatureData:v})}/>
          </div>
          <div className="modal-foot"><button className="btn-ghost" onClick={()=>{setProofRequired(false);setProofModal(null)}}>Cancel</button><button className="btn-primary" onClick={submitProof}>{proofRequired ? <><Check size={14}/> Complete Job</> : <><Save size={14}/> Save proof</>}</button></div>
        </div>
      </div>
    )}
  </>;
}


function SignaturePad({value,onChange}) {
  const ref=useRef(null); const drawing=useRef(false);
  const point=e=>{const c=ref.current,r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
  const start=e=>{drawing.current=true;const p=point(e),ctx=ref.current.getContext('2d');ctx.beginPath();ctx.moveTo(p.x,p.y);e.currentTarget.setPointerCapture?.(e.pointerId)};
  const move=e=>{if(!drawing.current)return;const p=point(e),ctx=ref.current.getContext('2d');ctx.lineWidth=2;ctx.lineCap='round';ctx.strokeStyle='#111827';ctx.lineTo(p.x,p.y);ctx.stroke()};
  const end=()=>{drawing.current=false;if(ref.current)onChange(ref.current.toDataURL('image/png'))};
  useEffect(()=>{if(value&&ref.current){const img=new Image();img.onload=()=>ref.current.getContext('2d').drawImage(img,0,0);img.src=value}},[]);
  return <div className="signature-box"><div className="signature-head"><span>Customer signature</span><button onClick={()=>{const c=ref.current;c.getContext('2d').clearRect(0,0,c.width,c.height);onChange('')}}>Clear</button></div><canvas ref={ref} width="700" height="180" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}/></div>;
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
  return <div className="feature-header"><div className="feature-header-left"><MobileBack setPage={setPage}/><div className="feature-title-icon"><Icon size={20}/></div><div><h1>{title}</h1>{sub&&<p>{sub}</p>}</div></div>{action}</div>;
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
  const {data,loading,refresh}=useStaffLive(call,'/staff/attendance',30000); const today=data?.[0]; const [clock,setClock]=useState(new Date()); const [busy,setBusy]=useState(false);
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id)},[]);
  const locate=()=>new Promise(resolve=>{if(!navigator.geolocation)return resolve(null);navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),()=>resolve(null),{enableHighAccuracy:true,timeout:7000})});
  const act=async type=>{setBusy(true);try{const location=await locate();await call(`/staff/attendance/${type}`,{method:'post',data:location?{location}:{} });await refresh()}catch(e){alert(e.response?.data?.message||e.message)}finally{setBusy(false)}};
  const active=today?.clockIn&&!today?.clockOut; const breaks=today?.breaks||[]; const onBreak=breaks.length>0&&!breaks[breaks.length-1].endedAt;
  const y=clock.getFullYear(), m=clock.getMonth(), monthDays=new Date(y,m+1,0).getDate(), firstDay=new Date(y,m,1).getDay();
  const attByDay=new Map((data||[]).filter(a=>String(a.dateKey||'').startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).map(a=>[Number(String(a.dateKey).slice(-2)),a]));
  const cal=[]; for(let i=0;i<firstDay;i++) cal.push(<span key={'blank'+i}/>); for(let d=1;d<=monthDays;d++){const a=attByDay.get(d); const future=d>clock.getDate(); const state=a?.clockIn?(a.lateMinutes>0?'late':'present'):(future?'future':'absent'); cal.push(<span key={d} className={'attendance-day '+state}>{d}</span>)}
  return <><FeatureHeader title="Attendance & Duty" sub={clock.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} setPage={setPage} Icon={Clock}/><div className="attendance-hero"><div><small>Current time</small><strong>{clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</strong><span className={active?'live-dot':''}>{active?'● On duty':'○ Off duty'}</span></div><button className={'duty-big-btn '+(active?'on':'')} onClick={()=>act(active?'clock-out':'clock-in')} disabled={busy}>{busy?'Updating…':active?'Clock out':'Clock in'}</button></div><div className="mini-stat-grid"><div><b>{data.filter(x=>x.clockIn).length}</b><span>Days present</span></div><div><b>{today?.lateMinutes||0}</b><span>Late minutes</span></div><div><b>{onBreak?'On break':'Working'}</b><span>Current state</span></div></div><div className="feature-card attendance-calendar-card"><div className="feature-card-head"><b>{clock.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</b><span>Monthly attendance</span></div><div className="attendance-week-head">{['S','M','T','W','T','F','S'].map((d,i)=><span key={i}>{d}</span>)}</div><div className="attendance-calendar-grid">{cal}</div><div className="calendar-legend"><span><i className="legend-dot attendance-present"/> Present</span><span><i className="legend-dot attendance-late"/> Late</span><span><i className="legend-dot attendance-absent"/> Absent</span></div></div><div className="feature-card"><div className="feature-card-head"><b>Today</b><span>{today?.clockIn?new Date(today.clockIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'} → {today?.clockOut?new Date(today.clockOut).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'Now'}</span></div><button className="premium-btn ghost full" onClick={()=>act('break')}>{onBreak?'End break':'Start break'}</button>{today?.location&&<div className="location-chip"><Navigation size={15}/> Location updated · ±{Math.round(today.location.accuracy||0)}m</div>}</div><div className="feature-card"><div className="feature-card-head"><b>Recent duty logs</b><span>{data.length} records</span></div>{data.slice(0,7).map(a=><div className="log-row" key={a._id}><span>{a.dateKey}</span><span>{a.clockIn?new Date(a.clockIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'} – {a.clockOut?new Date(a.clockOut).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'Active'}</span><em>{a.status}</em></div>)}</div></>;
}

function DailyChecklist({call,setPage}) { const {data,loading,refresh}=useStaffLive(call,'/staff/checklists',30000); const [rows,setRows]=useState([]); useEffect(()=>setRows(data||[]),[data]); const toggle=async(row,i)=>{const items=row.items.map((x,k)=>k===i?{...x,done:!x.done}:x);setRows(r=>r.map(x=>x._id===row._id?{...x,items}:x));try{await call(`/staff/checklists/${row._id}`,{method:'put',data:{items,title:row.title}})}catch(_){refresh()}}; return <><FeatureHeader title="Daily Checklist" sub="Complete your required work items" setPage={setPage} Icon={ClipboardCheck}/><div className="feature-stack">{loading&&<Loader/>}{!loading&&!rows.length&&<div className="premium-empty"><ClipboardCheck size={28}/><b>No checklist assigned</b><span>Your daily checklist will appear when Command Center assigns one.</span></div>}{rows.map(r=><div className="feature-card" key={r._id}><div className="feature-card-head"><b>{r.title||'Today’s checklist'}</b><span>{r.items.filter(i=>i.done).length}/{r.items.length}</span></div>{r.items.map((item,i)=><button className={'check-row'+(item.done?' done':'')} key={i} onClick={()=>toggle(r,i)}><span>{item.done?<CheckCircle size={20}/>:<span className="check-box"/>}</span><span>{item.label}</span></button>)}</div>)}</div></> }

function DocumentsVault({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/documents',60000); const docs=data||[]; return <><FeatureHeader title="Documents" sub="Your secure staff document vault" setPage={setPage} Icon={FileText}/><div className="doc-vault-grid">{loading&&<Loader/>}{!loading&&!docs.length&&<div className="premium-empty"><FileText size={28}/><b>No documents yet</b><span>HR and Command Center documents will appear here.</span></div>}{docs.map(d=><a className="vault-doc-card" href={d.url||'#'} target="_blank" rel="noreferrer" key={d._id}><span className="vault-doc-icon"><FileText size={22}/></span><strong>{d.title}</strong><small>{d.type||'Document'}</small><span className="doc-open"><Download size={14}/> Open</span></a>)}</div></> }

function Payslips({call,setPage}) { const {data,loading}=useStaffLive(call,'/staff/payslips',60000); const rows=data||[]; const money=v=>`₹${Number(v||0).toLocaleString('en-IN')}`; return <><FeatureHeader title="Payslips" sub="Salary statements and take-home history" setPage={setPage} Icon={CircleDollarSign}/>{!rows.length&&!loading?<div className="premium-empty"><CircleDollarSign size={28}/><b>No payslips published</b><span>Your monthly salary statements will appear here.</span></div>:<div className="payslip-grid">{rows.map(p=><div className="payslip-card" key={p._id}><div className="payslip-top"><div><small>{p.month}</small><strong>{money(p.net)}</strong></div><span>NET TAKE-HOME</span></div><div className="salary-lines"><span>Gross <b>{money(p.gross)}</b></span>{Object.entries(p.earnings||{}).slice(0,3).map(([k,v])=><span key={k}>{k}<b>{money(v)}</b></span>)}{Object.entries(p.deductions||{}).slice(0,3).map(([k,v])=><span key={k}>{k}<b>− {money(v)}</b></span>)}</div>{p.url?<a className="premium-btn ghost full" href={p.url} target="_blank" rel="noreferrer"><Download size={15}/> Download</a>:<span className="published-pill">Published</span>}</div>)}</div>}</> }

function SupportTickets({call,setPage}) { const {data,loading,refresh}=useStaffLive(call,'/staff/support',30000); const [open,setOpen]=useState(false); const [form,setForm]=useState({category:'TECHNICAL',subject:'',description:'',priority:'NORMAL'}); const [reply,setReply]=useState({}); const submit=async()=>{if(!form.subject||!form.description)return;await call('/staff/support',{method:'post',data:form});setForm({category:'TECHNICAL',subject:'',description:'',priority:'NORMAL'});setOpen(false);refresh()}; const sendReply=async(id)=>{if(!reply[id])return;await call(`/staff/support/${id}/messages`,{method:'post',data:{message:reply[id]}});setReply(r=>({...r,[id]:''}));refresh()}; return <><FeatureHeader title="Support" sub="Raise and track staff requests" setPage={setPage} Icon={MessageSquare} action={<button className="premium-btn" onClick={()=>setOpen(true)}><Plus size={15}/> New request</button>}/><div className="support-category-grid">{[['TECHNICAL','Technical',Settings],['HR','HR & People',UserCheck],['PAYROLL','Payroll',CircleDollarSign],['OPERATIONS','Operations',Briefcase]].map(([key,label,Icon])=><button key={key} className={'support-category '+(form.category===key?'active':'')} onClick={()=>{setForm({...form,category:key});setOpen(true)}}><span><Icon size={19}/></span><b>{label}</b><small>Raise {label.toLowerCase()} request</small></button>)}</div>{open&&<div className="feature-card"><div className="feature-card-head"><b>Raise a request</b><button className="icon-btn" onClick={()=>setOpen(false)}><X size={17}/></button></div><div className="form-field"><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>TECHNICAL</option><option>HR</option><option>PAYROLL</option><option>OPERATIONS</option><option>GENERAL</option></select></div><div className="form-field"><label>Subject</label><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></div><div className="form-field"><label>Details</label><textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><button className="premium-btn full" onClick={submit}><Send size={15}/> Submit request</button></div>}<div className="feature-stack">{loading&&<Loader/>}{!loading&&!data?.length&&<div className="premium-empty"><MessageSquare size={28}/><b>No support tickets</b><span>Need help? Create your first request.</span></div>}{(data||[]).map(t=><div className="ticket-card" key={t._id}><div className="ticket-head"><span>#{t.ticketNo}</span><em>{t.status}</em></div><strong>{t.subject}</strong><p>{t.description}</p><div className="ticket-thread">{(t.messages||[]).slice(-4).map((m,i)=><div key={i} className={m.senderRole=== 'STAFF'?'mine':'theirs'}><b>{m.senderRole}</b><span>{m.message}</span></div>)}</div><div className="ticket-reply"><input placeholder="Reply…" value={reply[t._id]||''} onChange={e=>setReply(r=>({...r,[t._id]:e.target.value}))}/><button onClick={()=>sendReply(t._id)}><Send size={15}/></button></div></div>)}</div></> }

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
  const mapRef          = React.useRef(null);
  const leafRef         = React.useRef(null);
  const markersRef      = React.useRef([]);
  const tooltipTimerRef = React.useRef(null);
  const hubsRef         = React.useRef(hubs);
  const drawScheduled   = React.useRef(false);
  const [tooltip, setTooltip] = React.useState(null);

  hubsRef.current = hubs;

  function scheduleDraw() {
    if (drawScheduled.current) return;
    drawScheduled.current = true;
    setTimeout(() => {
      drawScheduled.current = false;
      if (leafRef.current && hubsRef.current && hubsRef.current.length > 0) {
        leafRef.current.invalidateSize();
        drawStaffMarkers(leafRef.current, hubsRef.current);
      }
    }, 50);
  }

  React.useEffect(() => {
    if (leafRef.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
      .setView([20.5937, 78.9629], 5);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.getPane('markerPane').style.zIndex = 650;
    map.getPane('tooltipPane').style.zIndex = 700;
    delete window.L.Icon.Default.prototype._getIconUrl;
    window.L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' });
    leafRef.current = map;
    setTimeout(() => scheduleDraw(), 400);
  }, []);

  React.useEffect(() => { scheduleDraw(); }, [hubs]);

  function placeStaffMarker(map, hub, coords) {
    const color = STAFF_HUB_STATUS_COLOR[hub.status] || '#2563eb';
    const marker = window.L.circleMarker(coords, {
      radius: 13, fillColor: color, color: '#ffffff',
      weight: 3, opacity: 1, fillOpacity: 1, pane: 'markerPane',
    }).addTo(map);
    marker.bindTooltip(hub.name || '', {
      permanent: true, direction: 'bottom',
      offset: [0, 10], className: 'hub-map-label',
    }).openTooltip();
    marker.on('mouseover', e => {
      clearTimeout(tooltipTimerRef.current);
      const pt = map.latLngToContainerPoint(e.latlng);
      setTooltip({ hub, x: pt.x, y: pt.y });
    });
    marker.on('mouseout', () => { tooltipTimerRef.current = setTimeout(() => setTooltip(null), 150); });
    marker.on('click', () => onSelectHub(hub));
    markersRef.current.push(marker);
    return coords;
  }

  async function drawStaffMarkers(map, hubList) {
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch (_) {} });
    markersRef.current = [];
    const allCoords = [];
    for (const hub of hubList) {
      let coords = staffGetCoords(hub);
      if (!coords) coords = await staffGeocodeHub(hub);
      if (!coords) continue;
      placeStaffMarker(map, hub, coords);
      allCoords.push(coords);
    }
    if (allCoords.length === 0) return;
    if (allCoords.length === 1) {
      map.setView(allCoords[0], 14, { animate: false });
    } else {
      map.fitBounds(window.L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 14, animate: false });
    }
    map.invalidateSize();
  }

  React.useEffect(() => {
    if (!selectedHub || !leafRef.current) return;
    (async () => {
      let c = staffGetCoords(selectedHub);
      if (!c) c = await staffGeocodeHub(selectedHub);
      if (c && leafRef.current) leafRef.current.setView(c, 15, { animate: true });
    })();
  }, [selectedHub]);

  const sc = tooltip ? (STAFF_HUB_STATUS_COLOR[tooltip.hub.status] || '#2563eb') : '#16a34a';

  return (
    <div className="hub-map-container" style={{ position: 'relative' }}>
      <div ref={mapRef} id="staff-hub-map" style={{ height: 480, borderRadius: 12, overflow: 'hidden' }} />
      {tooltip && (() => {
        const coords  = staffGetCoords(tooltip.hub);
        const mapsUrl = coords
          ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((tooltip.hub.address ? tooltip.hub.address + ', ' : '') + (tooltip.hub.city || ''))}`;
        return (
          <div className="map-tooltip"
            style={{ left: tooltip.x, top: tooltip.y, pointerEvents: 'auto' }}
            onMouseEnter={() => clearTimeout(tooltipTimerRef.current)}
            onMouseLeave={() => setTooltip(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div className="map-tooltip-name">{tooltip.hub.name}</div>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Maps"
                 style={{ color: '#2563eb', flexShrink: 0, display: 'flex', alignItems: 'center', textDecoration: 'none', padding: '2px 0' }}>
                <MapPin size={16} />
              </a>
            </div>
            <div className="map-tooltip-row"><span>📍</span><strong>{tooltip.hub.city}</strong></div>
            {tooltip.hub.address && <div className="map-tooltip-row" style={{ fontSize: 11 }}>{tooltip.hub.address}</div>}
            <div className="map-tooltip-row"><span>⚡ Chargers:</span><strong>{tooltip.hub.chargerCount ?? 0}</strong></div>
            {tooltip.hub.code && <div className="map-tooltip-row"><span>🔖 Code:</span><strong>{tooltip.hub.code}</strong></div>}
            <div><span className="map-tooltip-status" style={{ background: sc + '22', color: sc }}>● {tooltip.hub.status}</span></div>
          </div>
        );
      })()}
      <div className="map-legend">
        {Object.entries(STAFF_HUB_STATUS_COLOR).map(([s, c]) => (
          <div key={s} className="legend-item">
            <div className="legend-dot" style={{ background: c }} />
            <span style={{ fontSize: 11, color: '#374151' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffChargeHubs({ call, setPage }) {
  const { data: hubs, loading, error } = useFetch(call, '/hubs');
  const [selectedHub,  setSelectedHub]  = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode,     setViewMode]     = useState('map');

  if (loading && !hubs) return <Loader />;
  if (error   && !hubs) return <div className="empty-state"><p style={{color:'#dc2626'}}>{error}</p></div>;

  const hubList      = hubs || [];
  const filtered     = statusFilter === 'ALL' ? hubList : hubList.filter(h => h.status === statusFilter);
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

      {/* Controls */}
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