/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Address = lazy(() => import('./pages/Address'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminNodeRegistrations = lazy(() => import('./pages/AdminNodeRegistrations'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Asset = lazy(() => import('./pages/Asset'));
const BlockDetail = lazy(() => import('./pages/BlockDetail'));
const BlockFeed = lazy(() => import('./pages/BlockFeed'));
const Blocks = lazy(() => import('./pages/Blocks'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DexPairs = lazy(() => import('./pages/DexPairs'));
const DistributionTool = lazy(() => import('./pages/DistributionTool'));
const Home = lazy(() => import('./pages/Home'));
const NetworkMap = lazy(() => import('./pages/NetworkMap'));
const NetworkStatistics = lazy(() => import('./pages/NetworkStatistics'));
const Node = lazy(() => import('./pages/Node'));
const NodeRegistration = lazy(() => import('./pages/NodeRegistration'));
const Peers = lazy(() => import('./pages/Peers'));
const Sustainability = lazy(() => import('./pages/Sustainability'));
const Transaction = lazy(() => import('./pages/Transaction'));
const TransactionMap = lazy(() => import('./pages/TransactionMap'));
const UnconfirmedTransactions = lazy(() => import('./pages/UnconfirmedTransactions'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));


export const PAGES = {
    "Address": Address,
    "AdminAnalytics": AdminAnalytics,
    "AdminNodeRegistrations": AdminNodeRegistrations,
    "AdminPanel": AdminPanel,
    "Asset": Asset,
    "BlockDetail": BlockDetail,
    "BlockFeed": BlockFeed,
    "Blocks": Blocks,
    "Dashboard": Dashboard,
    "DexPairs": DexPairs,
    "DistributionTool": DistributionTool,
    "Home": Home,
    "NetworkMap": NetworkMap,
    "NetworkStatistics": NetworkStatistics,
    "Node": Node,
    "NodeRegistration": NodeRegistration,
    "Peers": Peers,
    "Sustainability": Sustainability,
    "Transaction": Transaction,
    "TransactionMap": TransactionMap,
    "UnconfirmedTransactions": UnconfirmedTransactions,
    "UserDashboard": UserDashboard,
    "UserProfile": UserProfile,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};