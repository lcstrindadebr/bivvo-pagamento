import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value");
      
      if (error) throw error;
      
      const settings = (data || []).reduce((acc: Record<string, string>, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      
      return settings;
    },
  });
}

export function useAppUrl() {
  const { data: settings } = useSiteSettings();
  
  // If we have a site_url configured in settings, use it.
  // Otherwise, fallback to the current window location origin.
  const baseUrl = settings?.site_url || window.location.origin;
  
  return baseUrl;
}
