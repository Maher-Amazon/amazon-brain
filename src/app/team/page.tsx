"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Shield, Eye, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const teamMembers = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    lastActive: "2024-02-08",
    permissions: {
      viewDashboard: true,
      viewBrands: true,
      viewCampaigns: true,
      editGoals: true,
      editModes: true,
      inviteUsers: true,
    },
  },
  {
    id: "2",
    name: "John Smith",
    email: "john@adagency.com",
    role: "viewer",
    lastActive: "2024-02-07",
    permissions: {
      viewDashboard: true,
      viewBrands: true,
      viewCampaigns: true,
      editGoals: false,
      editModes: false,
      inviteUsers: false,
    },
  },
  {
    id: "3",
    name: "Sarah Johnson",
    email: "sarah@adagency.com",
    role: "viewer",
    lastActive: "2024-02-05",
    permissions: {
      viewDashboard: true,
      viewBrands: true,
      viewCampaigns: false,
      editGoals: false,
      editModes: false,
      inviteUsers: false,
    },
  },
];

const permissionLabels: Record<string, { label: string; description: string }> = {
  viewDashboard: {
    label: "View Dashboard",
    description: "Access to main dashboard and KPIs",
  },
  viewBrands: {
    label: "View Brands",
    description: "Access to brand details and SKU data",
  },
  viewCampaigns: {
    label: "View Campaigns",
    description: "Access to campaign performance data",
  },
  editGoals: {
    label: "Edit Goals",
    description: "Modify TACoS/ACoS targets",
  },
  editModes: {
    label: "Edit Modes",
    description: "Change brand and SKU modes",
  },
  inviteUsers: {
    label: "Invite Users",
    description: "Add new team members",
  },
};

export default function TeamPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their access permissions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Members List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {teamMembers.length} members with account access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow
                      key={member.id}
                      className={
                        selectedUser === member.id ? "bg-muted/50" : ""
                      }
                      onClick={() => setSelectedUser(member.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "admin" ? "default" : "secondary"
                          }
                          className="gap-1"
                        >
                          {member.role === "admin" ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.lastActive).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Remove Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                {selectedUser
                  ? `Edit permissions for ${
                      teamMembers.find((m) => m.id === selectedUser)?.name
                    }`
                  : "Select a team member to edit permissions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  {Object.entries(permissionLabels).map(([key, config]) => {
                    const member = teamMembers.find(
                      (m) => m.id === selectedUser
                    );
                    const isEnabled =
                      member?.permissions[
                        key as keyof typeof member.permissions
                      ];

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <Label htmlFor={key}>{config.label}</Label>
                          <p className="text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                        <Switch
                          id={key}
                          checked={isEnabled}
                          disabled={member?.role === "admin"}
                        />
                      </div>
                    );
                  })}
                  {teamMembers.find((m) => m.id === selectedUser)?.role ===
                    "admin" && (
                    <p className="text-xs text-muted-foreground italic">
                      Admin users have full access. Permissions cannot be
                      modified.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click on a team member to view and edit their permissions.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Role Legend */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Role Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Full access to all features including goal changes and user
                  management
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Viewer
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Customizable view-only access. Perfect for ad managers and
                  consultants.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
