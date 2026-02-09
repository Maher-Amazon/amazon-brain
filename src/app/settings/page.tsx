"use client";

import { useState } from "react";
import { Save, RefreshCw, Mail, Bell } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    currency: "AED",
    timezone: "Asia/Dubai",
    vatRate: 5,
    emailRecipients: "admin@example.com",
    strategicReportEnabled: true,
    strategicReportFrequency: 5,
    stockAlertsEnabled: true,
    urgentAlertsEnabled: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your account and notification preferences
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure your account preferences and regional settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) =>
                  setSettings({ ...settings, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) =>
                  setSettings({ ...settings, timezone: value })
                }
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Dubai">
                    Dubai (GMT+4)
                  </SelectItem>
                  <SelectItem value="Asia/Riyadh">
                    Riyadh (GMT+3)
                  </SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">VAT Rate (%)</Label>
              <Input
                id="vat"
                type="number"
                value={settings.vatRate}
                onChange={(e) =>
                  setSettings({ ...settings, vatRate: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email reports and alert preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email-recipients">Email Recipients</Label>
            <Input
              id="email-recipients"
              placeholder="email@example.com, another@example.com"
              value={settings.emailRecipients}
              onChange={(e) =>
                setSettings({ ...settings, emailRecipients: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          <Separator />

          {/* Strategic Report */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="strategic-report" className="text-base">
                Strategic Report
              </Label>
              <p className="text-sm text-muted-foreground">
                AI-powered analysis with trends, suggestions, and tips
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Every</span>
                <Input
                  type="number"
                  className="w-16"
                  value={settings.strategicReportFrequency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      strategicReportFrequency: Number(e.target.value),
                    })
                  }
                  disabled={!settings.strategicReportEnabled}
                />
                <span className="text-sm">days</span>
              </div>
              <Switch
                id="strategic-report"
                checked={settings.strategicReportEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, strategicReportEnabled: checked })
                }
              />
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="stock-alerts" className="text-base">
                Stock Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Predictive alerts when inventory runs low
              </p>
            </div>
            <Switch
              id="stock-alerts"
              checked={settings.stockAlertsEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, stockAlertsEnabled: checked })
              }
            />
          </div>

          {/* Urgent Alerts */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="urgent-alerts" className="text-base">
                Urgent Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Immediate email for critical issues (stock out, major spend
                increase)
              </p>
            </div>
            <Switch
              id="urgent-alerts"
              checked={settings.urgentAlertsEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, urgentAlertsEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Sync
          </CardTitle>
          <CardDescription>
            Manage data synchronization with Amazon Seller Central
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Last Sync</p>
              <p className="text-sm text-muted-foreground">
                February 8, 2024 at 3:45 PM
              </p>
            </div>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <p className="font-medium">Automatic Sync Schedule</p>
            <p className="text-sm text-muted-foreground">
              Data is automatically synced daily at 6:00 AM Dubai time
            </p>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Next sync: Tomorrow at 6:00 AM
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Connections */}
      <Card>
        <CardHeader>
          <CardTitle>API Connections</CardTitle>
          <CardDescription>
            Status of your Amazon API integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-success" />
              <div>
                <p className="font-medium">SP-API (Selling Partner)</p>
                <p className="text-sm text-muted-foreground">
                  Orders, Sales, Inventory
                </p>
              </div>
            </div>
            <span className="text-sm text-success">Connected</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-success" />
              <div>
                <p className="font-medium">Amazon Ads API</p>
                <p className="text-sm text-muted-foreground">
                  Campaigns, Search Terms, Performance
                </p>
              </div>
            </div>
            <span className="text-sm text-success">Connected</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
