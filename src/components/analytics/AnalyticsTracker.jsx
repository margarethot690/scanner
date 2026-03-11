import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { PageView } from "@/api/entities";

// Generate or retrieve visitor ID from localStorage
const getVisitorId = () => {
  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
};

// Generate or retrieve session ID from sessionStorage
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("session_id", sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

// Detect browser
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
};

export default function AnalyticsTracker() {
  const location = useLocation();
  const pageStartTime = useRef(Date.now());
  const currentPageViewId = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const trackPageView = async () => {
      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      
      try {
        // Create page view record
        const pageView = await PageView.create({
          page_path: location.pathname,
          page_title: document.title,
          visitor_id: visitorId,
          session_id: sessionId,
          user_email: user?.email || null,
          referrer: document.referrer || "direct",
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          browser: getBrowser(),
          time_on_page: 0,
          exit_page: false,
        });
        
        currentPageViewId.current = pageView.id;
        pageStartTime.current = Date.now();
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    };

    trackPageView();

    // Update time on page when leaving
    return () => {
      if (currentPageViewId.current) {
        const timeOnPage = Math.floor((Date.now() - pageStartTime.current) / 1000);
        PageView.update(currentPageViewId.current, {
          time_on_page: timeOnPage,
        }).catch(() => {
          // Silently fail if update doesn't work
        });
      }
    };
  }, [location.pathname, user]);

  return null; // This component doesn't render anything
}