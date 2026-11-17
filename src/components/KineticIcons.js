// KineticAI's hand-drawn, inline SVG symbol set. Kept local so icon rendering
// has no third-party font, sprite, CDN, or icon-pack runtime dependency.
const shapes = {
  AlertCircle: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 5v4.2m0 3.4h.01",
  AlertTriangle: "m12 3.5 9 16H3l9-16Zm0 5.2v4.7m0 3.2h.01",
  ArrowDown: "M12 4v15m-6-6 6 6 6-6",
  ArrowLeft: "M19 12H5m7-7-7 7 7 7",
  ArrowUp: "M12 20V5m-6 6 6-6 6 6",
  Ban: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM6 6l12 12",
  BarChart3: "M4 20V11m5 9V5m6 15v-7m5 7V3",
  Bell: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4",
  BookOpen: "M3.5 5.5c3-1.3 5.9-.8 8.5 1.3v13c-2.6-2.1-5.5-2.6-8.5-1.3v-13Zm17 0c-3-1.3-5.9-.8-8.5 1.3v13c2.6-2.1 5.5-2.6 8.5-1.3v-13Z",
  Bot: "M12 4v3m-4 0h8a4 4 0 0 1 4 4v6H4v-6a4 4 0 0 1 4-4Zm-4 8H2m20 0h-2M9 12h.01M15 12h.01m-7 5v2h8v-2",
  Brain: "M12 4a3.5 3.5 0 0 0-6 2.5A3.5 3.5 0 0 0 5 13a3.5 3.5 0 0 0 4 6h3V4Zm0 0a3.5 3.5 0 0 1 6 2.5 3.5 3.5 0 0 1 1 6.5 3.5 3.5 0 0 1-4 6h-3m0-12v10m-4-7h4m4 3h-4",
  Check: "m5 12 4.2 4.2L19.5 6",
  CheckCircle2: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-4.1 8.6 2.6 2.6 5.7-5.8",
  CheckSquare: "M5 4h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 4Zm2.5 8 2.8 2.8 6.2-6.3",
  ChevronDown: "m6 9 6 6 6-6",
  ChevronRight: "m9 6 6 6-6 6",
  ChevronUp: "m6 15 6-6 6 6",
  Cloud: "M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 4.8 4.8 0 0 0 7 18Z",
  Code2: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  Copy: "M8 8V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H16M5.5 8h9A1.5 1.5 0 0 1 16 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 18.5v-9A1.5 1.5 0 0 1 5.5 8Z",
  Database: "M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm-8 3v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7m-16 5c0 1.7 3.6 3 8 3s8-1.3 8-3",
  Download: "M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3",
  ExternalLink: "M13 5h6v6m0-6-9 9m-1-7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3",
  FileText: "M6 3.5h8l4 4V20H6a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Zm8 0v4h4m-9 5h6m-6 4h6",
  FileUp: "M6 3.5h8l4 4V12M14 3.5v4h4M6 20h6m-3-5v5m-3-3 3-3 3 3m3-1v5h5",
  Flag: "M5 21V4m0 1c5-4 9 3 14-1v10c-5 4-9-3-14 1",
  Folder: "M3.5 7A2.5 2.5 0 0 1 6 4.5h4l2 2H18A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17V7Z",
  FolderInput: "M3.5 7A2.5 2.5 0 0 1 6 4.5h4l2 2H18A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17V7Zm8.5 1v7m-3-3 3 3 3-3",
  FolderKanban: "M3.5 7A2.5 2.5 0 0 1 6 4.5h4l2 2H18A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17V7Zm5 2v7m3-7v3m3-3v5",
  FolderPlus: "M3.5 7A2.5 2.5 0 0 1 6 4.5h4l2 2H18A2.5 2.5 0 0 1 20.5 9v8A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17V7Zm8.5 2v6m-3-3h6",
  Globe: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-8 8.5h16m-8-8.5a13 13 0 0 1 0 17m0-17a13 13 0 0 0 0 17",
  HelpCircle: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-2.4 6.2a2.6 2.6 0 1 1 4.6 1.7c-1.5 1.5-2.2 1.6-2.2 3.2m0 2.4h.01",
  Image: "M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5Zm2 11 4-4 2.5 2.5 2-2 3.5 3.5M8 9h.01",
  KeyRound: "M14 8a5 5 0 1 1-1.4-3.5L21 13v3h-3v3h-3v-3l-3.4-3.4M17 9h.01",
  Link2: "M9 15l6-6m-8 9H5a4 4 0 0 1 0-8h4m6-4h4a4 4 0 0 1 0 8h-4",
  ListTodo: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  Loader2: "M12 3.5a8.5 8.5 0 0 1 8.5 8.5",
  Lock: "M6 10h12a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 6 10Zm2.5 0V7a3.5 3.5 0 0 1 7 0v3m-3.5 4v2.5",
  LockKeyhole: "M6 10h12a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 6 10Zm2.5 0V7a3.5 3.5 0 0 1 7 0v3m-3.5 4v2.5",
  LogOut: "M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5m4-4 4-3-4-3m4 3H9",
  Mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  Menu: "M4 6h16M4 12h16M4 18h16",
  MessageSquare: "M5 4.5h14A2.5 2.5 0 0 1 21.5 7v8a2.5 2.5 0 0 1-2.5 2.5h-8L5 21v-3.5a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 5 4.5Z",
  Mic: "M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15Zm-6-4a6 6 0 0 0 12 0m-6 6v4m-3 0h6",
  Monitor: "M4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4ZM8 21h8m-4-4v4",
  Moon: "M19.5 15A8 8 0 0 1 9 4.5 8.5 8.5 0 1 0 19.5 15Z",
  Paperclip: "m8 12.5 6.6-6.6a3.2 3.2 0 0 1 4.5 4.5l-8.6 8.5a5 5 0 0 1-7-7l8.2-8.1",
  Pencil: "m4 16.5-.8 4.3 4.3-.8L19 8.5a3 3 0 0 0-4.2-4.2L4 16.5Zm9.5-10 4 4",
  Plus: "M12 5v14m-7-7h14",
  RefreshCw: "M20 7V3m0 4h-4m4 0a8 8 0 0 0-14-2M4 17v4m0-4h4m-4 0a8 8 0 0 0 14 2",
  RotateCcw: "M4 8V4m0 4h4m-4 0a8 8 0 1 1-1 8m7-4h5",
  Scale: "M12 3v18m-7-3h14M5 6h14M5 6l-3 7h6L5 6Zm14 0-3 7h6l-3-7ZM8 21h8",
  Search: "M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Zm5.2-1.8 4.5 4.3",
  Send: "m21 3-7.2 18-3.7-7.1L3 10.2 21 3Zm-10.9 10.9L21 3",
  Settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m9-8h-2m-14 0H3m15.4-6.4-1.4 1.4m-10 10L5.6 19m12.8 0L17 17.6m-10-10L5.6 6.4",
  Shield: "M12 3 20 6v5.5c0 5-3.5 8-8 9.5-4.5-1.5-8-4.5-8-9.5V6l8-3Zm-3 9 2 2 4-4",
  ShieldCheck: "M12 3 20 6v5.5c0 5-3.5 8-8 9.5-4.5-1.5-8-4.5-8-9.5V6l8-3Zm-3 9 2 2 4-4",
  Sliders: "M4 6h9m4 0h3M4 12h3m4 0h9M4 18h9m4 0h3m-4-14v4m-6 2v4m6 2v4",
  Smartphone: "M7 3h10a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 17 21H7a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 7 3Zm4 15h2",
  Sparkles: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 15l.7 1.8L7.5 17.5l-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15Z",
  Square: "M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4Z",
  Sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2m9-9h-2M5 12H3m15.4-6.4L17 7m-10 10-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6",
  Trash2: "M4 7h16m-13 0 1 13h8l1-13M9 7V4h6v3m-5 4v5m4-5v5",
  Upload: "M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4",
  User: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  UserRound: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  X: "m6 6 12 12M18 6 6 18",
  Zap: "m13 2-9 12h7l-1 8 10-13h-7l1-7Z",
};

function KineticIcon({ name, size = 24, strokeWidth = 1.7, className = "", ...props }) {
  const path = shapes[name];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={name === "Loader2" ? `${className} animate-spin`.trim() : className} aria-hidden="true" focusable="false" {...props}>
      <path d={path} />
    </svg>
  );
}

export {
  KineticIcon,
  AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Ban, BarChart3,
  Bell, BookOpen, Bot, Brain, Check, CheckCircle2, CheckSquare, ChevronDown,
  ChevronRight, ChevronUp, Cloud, Code2, Copy, Database, Download, ExternalLink,
  FileText, FileUp, Flag, Folder, FolderInput, FolderKanban, FolderPlus, Globe,
  HelpCircle, Image, KeyRound, Link2, ListTodo, Loader2, Lock, LockKeyhole, LogOut,
  Mail, Menu, MessageSquare, Mic, Monitor, Moon, Paperclip, Pencil, Plus, RefreshCw,
  RotateCcw, Scale, Search, Send, Settings, Shield, ShieldCheck, Sliders, Smartphone,
  Sparkles, Square, Sun, Trash2, Upload, User, UserRound, X, Zap,
};

function named(name) {
  return function Icon(props) { return <KineticIcon name={name} {...props} />; };
}

const AlertCircle = named("AlertCircle");
const AlertTriangle = named("AlertTriangle");
const ArrowDown = named("ArrowDown");
const ArrowLeft = named("ArrowLeft");
const ArrowUp = named("ArrowUp");
const Ban = named("Ban");
const BarChart3 = named("BarChart3");
const Bell = named("Bell");
const BookOpen = named("BookOpen");
const Bot = named("Bot");
const Brain = named("Brain");
const Check = named("Check");
const CheckCircle2 = named("CheckCircle2");
const CheckSquare = named("CheckSquare");
const ChevronDown = named("ChevronDown");
const ChevronRight = named("ChevronRight");
const ChevronUp = named("ChevronUp");
const Cloud = named("Cloud");
const Code2 = named("Code2");
const Copy = named("Copy");
const Database = named("Database");
const Download = named("Download");
const ExternalLink = named("ExternalLink");
const FileText = named("FileText");
const FileUp = named("FileUp");
const Flag = named("Flag");
const Folder = named("Folder");
const FolderInput = named("FolderInput");
const FolderKanban = named("FolderKanban");
const FolderPlus = named("FolderPlus");
const Globe = named("Globe");
const HelpCircle = named("HelpCircle");
const Image = named("Image");
const KeyRound = named("KeyRound");
const Link2 = named("Link2");
const ListTodo = named("ListTodo");
const Loader2 = named("Loader2");
const Lock = named("Lock");
const LockKeyhole = named("LockKeyhole");
const LogOut = named("LogOut");
const Mail = named("Mail");
const Menu = named("Menu");
const MessageSquare = named("MessageSquare");
const Mic = named("Mic");
const Monitor = named("Monitor");
const Moon = named("Moon");
const Paperclip = named("Paperclip");
const Pencil = named("Pencil");
const Plus = named("Plus");
const RefreshCw = named("RefreshCw");
const RotateCcw = named("RotateCcw");
const Scale = named("Scale");
const Search = named("Search");
const Send = named("Send");
const Settings = named("Settings");
const Shield = named("Shield");
const ShieldCheck = named("ShieldCheck");
const Sliders = named("Sliders");
const Smartphone = named("Smartphone");
const Sparkles = named("Sparkles");
const Square = named("Square");
const Sun = named("Sun");
const Trash2 = named("Trash2");
const Upload = named("Upload");
const User = named("User");
const UserRound = named("UserRound");
const X = named("X");
const Zap = named("Zap");
