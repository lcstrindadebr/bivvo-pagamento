import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Globe, Palette, Bell, Plug, FileText } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { GeneralTab } from '@/components/admin/settings/GeneralTab';
import { BrandingTab } from '@/components/admin/settings/BrandingTab';
import { NotificationsTab } from '@/components/admin/settings/NotificationsTab';
import { IntegrationsTab } from '@/components/admin/settings/IntegrationsTab';
import { LogsTab } from '@/components/admin/settings/LogsTab';

export function AdminSettings() {
  const { data, isLoading } = useSiteSettings();
  const settings = (data || {}) as Record<string, string>;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="general" className="gap-1.5"><Globe className="h-4 w-4" /> Geral</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5"><Palette className="h-4 w-4" /> Marca</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5"><Plug className="h-4 w-4" /> Integrações</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><FileText className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="general"><GeneralTab settings={settings} loading={isLoading} /></TabsContent>
        <TabsContent value="branding"><BrandingTab settings={settings} loading={isLoading} /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab settings={settings} loading={isLoading} /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab settings={settings} loading={isLoading} /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

