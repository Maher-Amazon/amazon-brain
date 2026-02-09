"use client";

import { useState } from "react";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EventUae } from "@/lib/supabase";

// Sample data - in production this would come from Supabase
const sampleEvents: EventUae[] = [
  {
    id: "1",
    name: "Ramadan",
    start_date: "2025-02-28",
    end_date: "2025-03-29",
    status: "confirmed",
    impact_level: "high",
    description: "Holy month - significant impact on buying patterns",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "2",
    name: "Eid Al Fitr",
    start_date: "2025-03-30",
    end_date: "2025-04-02",
    status: "confirmed",
    impact_level: "high",
    description: "End of Ramadan celebration",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "3",
    name: "Dubai Summer Surprises",
    start_date: "2025-06-28",
    end_date: "2025-09-03",
    status: "tbc",
    impact_level: "medium",
    description: "Annual summer shopping festival",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "4",
    name: "UAE National Day",
    start_date: "2025-12-02",
    end_date: "2025-12-03",
    status: "confirmed",
    impact_level: "medium",
    description: "National holiday celebrations",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "5",
    name: "White Friday",
    start_date: "2025-11-28",
    end_date: "2025-12-01",
    status: "tbc",
    impact_level: "high",
    description: "Black Friday equivalent - major sales event",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

const impactColors = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusIcons = {
  tbc: Clock,
  confirmed: CheckCircle,
  cancelled: XCircle,
};

const statusColors = {
  tbc: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(dateStr: string) {
  const today = new Date();
  const eventDate = new Date(dateStr);
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventUae[]>(sampleEvents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventUae | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "tbc" as "tbc" | "confirmed" | "cancelled",
    impact_level: "medium" as "high" | "medium" | "low",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      status: "tbc",
      impact_level: "medium",
      description: "",
    });
    setEditingEvent(null);
  };

  const handleOpenDialog = (event?: EventUae) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
        status: event.status,
        impact_level: event.impact_level,
        description: event.description || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingEvent) {
      setEvents(events.map(e =>
        e.id === editingEvent.id
          ? { ...e, ...formData, updated_at: new Date().toISOString() }
          : e
      ));
    } else {
      const newEvent: EventUae = {
        id: String(Date.now()),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setEvents([...events, newEvent]);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const toggleStatus = (event: EventUae) => {
    const nextStatus = event.status === "tbc" ? "confirmed" : "tbc";
    setEvents(events.map(e =>
      e.id === event.id
        ? { ...e, status: nextStatus, updated_at: new Date().toISOString() }
        : e
    ));
  };

  // Sort events by start date
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Upcoming events (next 30 days)
  const upcomingEvents = sortedEvents.filter(e => {
    const daysUntil = getDaysUntil(e.start_date);
    return daysUntil >= 0 && daysUntil <= 30;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UAE Events Calendar</h1>
          <p className="text-muted-foreground">
            Track regional events that impact sales and advertising
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "Add New Event"}
              </DialogTitle>
              <DialogDescription>
                {editingEvent
                  ? "Update the event details below."
                  : "Enter the details for the new event."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Ramadan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as "tbc" | "confirmed" | "cancelled" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tbc">TBC</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Impact Level</Label>
                  <Select
                    value={formData.impact_level}
                    onValueChange={(v) => setFormData({ ...formData, impact_level: v as "high" | "medium" | "low" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the event impact..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingEvent ? "Save Changes" : "Add Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Events Alert */}
      {upcomingEvents.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-yellow-500" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {upcomingEvents.map((event) => {
                const daysUntil = getDaysUntil(event.start_date);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
                  >
                    <Badge variant="outline" className={impactColors[event.impact_level]}>
                      {event.impact_level}
                    </Badge>
                    <span className="font-medium">{event.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {daysUntil === 0
                        ? "Today"
                        : daysUntil === 1
                        ? "Tomorrow"
                        : `in ${daysUntil} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            Click the status badge to toggle between TBC and Confirmed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvents.map((event) => {
                const StatusIcon = statusIcons[event.status];
                const daysUntil = getDaysUntil(event.start_date);
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date);
                const duration = Math.ceil(
                  (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;

                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.name}</div>
                        {event.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(event.start_date)} - {formatDate(event.end_date)}
                      </div>
                      {daysUntil >= 0 && daysUntil <= 30 && (
                        <div className="text-xs text-yellow-500 font-medium">
                          {daysUntil === 0
                            ? "Starts today"
                            : daysUntil === 1
                            ? "Starts tomorrow"
                            : `Starts in ${daysUntil} days`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {duration} {duration === 1 ? "day" : "days"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-auto p-0", statusColors[event.status])}
                        onClick={() => toggleStatus(event)}
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "cursor-pointer hover:opacity-80",
                            statusColors[event.status]
                          )}
                        >
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {event.status.toUpperCase()}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={impactColors[event.impact_level]}>
                        {event.impact_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(event)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Impact Level Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Levels</CardTitle>
          <CardDescription>
            How events affect sales and advertising strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <Badge variant="outline" className={impactColors.high}>
                High Impact
              </Badge>
              <p className="text-sm text-muted-foreground">
                Major shopping events with significant sales uplift. Increase ad budgets, ensure stock levels, plan promotional campaigns.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <Badge variant="outline" className={impactColors.medium}>
                Medium Impact
              </Badge>
              <p className="text-sm text-muted-foreground">
                Notable events with moderate effect on buying patterns. Monitor performance closely and adjust bids as needed.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <Badge variant="outline" className={impactColors.low}>
                Low Impact
              </Badge>
              <p className="text-sm text-muted-foreground">
                Minor events with minimal sales impact. Maintain normal operations but track for future reference.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
