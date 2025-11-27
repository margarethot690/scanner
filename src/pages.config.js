import Dashboard from './pages/Dashboard';
import Blocks from './pages/Blocks';
import BlockDetail from './pages/BlockDetail';
import Address from './pages/Address';
import Transaction from './pages/Transaction';
import Asset from './pages/Asset';
import Peers from './pages/Peers';
import Node from './pages/Node';
import DistributionTool from './pages/DistributionTool';
import UnconfirmedTransactions from './pages/UnconfirmedTransactions';
import NetworkStatistics from './pages/NetworkStatistics';
import BlockFeed from './pages/BlockFeed';
import NetworkMap from './pages/NetworkMap';
import TransactionMap from './pages/TransactionMap';
import UserProfile from './pages/UserProfile';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import DexPairs from './pages/DexPairs';
import AdminAnalytics from './pages/AdminAnalytics';
import NodeRegistration from './pages/NodeRegistration';
import AdminNodeRegistrations from './pages/AdminNodeRegistrations';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Blocks": Blocks,
    "BlockDetail": BlockDetail,
    "Address": Address,
    "Transaction": Transaction,
    "Asset": Asset,
    "Peers": Peers,
    "Node": Node,
    "DistributionTool": DistributionTool,
    "UnconfirmedTransactions": UnconfirmedTransactions,
    "NetworkStatistics": NetworkStatistics,
    "BlockFeed": BlockFeed,
    "NetworkMap": NetworkMap,
    "TransactionMap": TransactionMap,
    "UserProfile": UserProfile,
    "UserDashboard": UserDashboard,
    "AdminPanel": AdminPanel,
    "DexPairs": DexPairs,
    "AdminAnalytics": AdminAnalytics,
    "NodeRegistration": NodeRegistration,
    "AdminNodeRegistrations": AdminNodeRegistrations,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};