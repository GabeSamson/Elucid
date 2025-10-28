'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamTask {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string | null;
  assignedUser: { name: string | null; email: string } | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PersonalTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WorkspacePage() {
  const router = useRouter();

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'team-tasks' | 'personal-tasks'>('calendar');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTeamTaskModal, setShowTeamTaskModal] = useState(false);
  const [showPersonalTaskModal, setShowPersonalTaskModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTeamTask, setEditingTeamTask] = useState<TeamTask | null>(null);
  const [editingPersonalTask, setEditingPersonalTask] = useState<PersonalTask | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [singleDateMode, setSingleDateMode] = useState(false);
  const [teamTaskForm, setTeamTaskForm] = useState({ title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' });
  const [personalTaskForm, setPersonalTaskForm] = useState({ title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' });

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [showAllCompleted, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showAllCompleted) {
        params.set('showAllCompleted', 'true');
      }
      if (sortBy) {
        params.set('sortBy', sortBy);
      }

      const [eventsRes, teamTasksRes, personalTasksRes] = await Promise.all([
        fetch('/api/admin/workspace/calendar'),
        fetch(`/api/admin/workspace/team-tasks?${params.toString()}`),
        fetch(`/api/workspace/personal-tasks?${params.toString()}`),
      ]);

      const [eventsData, teamTasksData, personalTasksData] = await Promise.all([
        eventsRes.json(),
        teamTasksRes.json(),
        personalTasksRes.json(),
      ]);

      if (eventsData.events) setEvents(eventsData.events);
      if (teamTasksData.tasks) setTeamTasks(teamTasksData.tasks);
      if (personalTasksData.tasks) setPersonalTasks(personalTasksData.tasks);
    } catch (error) {
      console.error('Failed to load workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar Event Handlers
  const openEventModal = (event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      const startDateStr = event.startDate.split('T')[0];
      const endDateStr = event.endDate.split('T')[0];
      const isSingleDate = startDateStr === endDateStr;

      setEventForm({
        title: event.title,
        description: event.description || '',
        startDate: startDateStr,
        endDate: endDateStr,
      });
      setSingleDateMode(isSingleDate);
    } else {
      setEditingEvent(null);
      setEventForm({ title: '', description: '', startDate: '', endDate: '' });
      setSingleDateMode(false);
    }
    setShowEventModal(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      // If single date mode, set endDate to startDate
      const formData = singleDateMode
        ? { ...eventForm, endDate: eventForm.startDate }
        : eventForm;

      const method = editingEvent ? 'PATCH' : 'POST';
      const body = editingEvent
        ? { id: editingEvent.id, ...formData }
        : formData;

      const res = await fetch('/api/admin/workspace/calendar', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', message: editingEvent ? 'Event updated' : 'Event created' });
        setShowEventModal(false);
        await loadData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save event' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;

    try {
      const res = await fetch(`/api/admin/workspace/calendar?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Event deleted' });
        await loadData();
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete event' });
    }
  };

  // Team Task Handlers
  const openTeamTaskModal = (task?: TeamTask) => {
    if (task) {
      setEditingTeamTask(task);
      setTeamTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      });
    } else {
      setEditingTeamTask(null);
      setTeamTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
    }
    setShowTeamTaskModal(true);
  };

  const handleTeamTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const method = editingTeamTask ? 'PATCH' : 'POST';
      const body = editingTeamTask
        ? { id: editingTeamTask.id, ...teamTaskForm }
        : teamTaskForm;

      const res = await fetch('/api/admin/workspace/team-tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', message: editingTeamTask ? 'Task updated' : 'Task created' });
        setShowTeamTaskModal(false);
        await loadData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save task' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTeamTask = async (task: TeamTask) => {
    try {
      const res = await fetch('/api/admin/workspace/team-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const deleteTeamTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      const res = await fetch(`/api/admin/workspace/team-tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Task deleted' });
        await loadData();
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete task' });
    }
  };

  // Personal Task Handlers
  const openPersonalTaskModal = (task?: PersonalTask) => {
    if (task) {
      setEditingPersonalTask(task);
      setPersonalTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      });
    } else {
      setEditingPersonalTask(null);
      setPersonalTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
    }
    setShowPersonalTaskModal(true);
  };

  const handlePersonalTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const method = editingPersonalTask ? 'PATCH' : 'POST';
      const body = editingPersonalTask
        ? { id: editingPersonalTask.id, ...personalTaskForm }
        : personalTaskForm;

      const res = await fetch('/api/workspace/personal-tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', message: editingPersonalTask ? 'Task updated' : 'Task created' });
        setShowPersonalTaskModal(false);
        await loadData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save task' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePersonalTask = async (task: PersonalTask) => {
    try {
      const res = await fetch('/api/workspace/personal-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const deletePersonalTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      const res = await fetch(`/api/workspace/personal-tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Task deleted' });
        await loadData();
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete task' });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-charcoal-dark text-cream border-charcoal-dark';
      case 'medium': return 'bg-beige text-charcoal border-beige';
      case 'low': return 'bg-beige/30 text-charcoal border-beige';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-charcoal/60">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl text-charcoal-dark mb-2">Team Workspace</h1>
        <p className="text-charcoal/60">Shared calendar, team tasks, and personal to-dos</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 border ${feedback.type === 'success' ? 'bg-beige/20 border-beige text-charcoal' : 'bg-cream-dark border-charcoal text-charcoal-dark'}`}>
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-charcoal/20">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-charcoal-dark text-charcoal-dark' : 'border-transparent text-charcoal/60 hover:text-charcoal'}`}
            >
              Calendar ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('team-tasks')}
              className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'team-tasks' ? 'border-charcoal-dark text-charcoal-dark' : 'border-transparent text-charcoal/60 hover:text-charcoal'}`}
            >
              Team Tasks ({teamTasks.filter(t => !t.completed).length})
            </button>
            <button
              onClick={() => setActiveTab('personal-tasks')}
              className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'personal-tasks' ? 'border-charcoal-dark text-charcoal-dark' : 'border-transparent text-charcoal/60 hover:text-charcoal'}`}
            >
              My Tasks ({personalTasks.filter(t => !t.completed).length})
            </button>
          </div>

          {/* Sort and Filter Controls (only visible on task tabs) */}
          {(activeTab === 'team-tasks' || activeTab === 'personal-tasks') && (
            <div className="flex items-center gap-4">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-charcoal">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'priority' | 'dueDate' | 'createdAt')}
                  className="px-3 py-2 text-sm border border-charcoal/20 focus:border-charcoal focus:outline-none bg-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B6560%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                >
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                  <option value="createdAt">Date Created</option>
                </select>
              </div>

              {/* Show Completed Toggle */}
              <label className="flex items-center gap-2 px-4 py-2 text-sm text-charcoal cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllCompleted}
                  onChange={(e) => setShowAllCompleted(e.target.checked)}
                  className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                <span>Show all completed</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <button
            onClick={() => openEventModal()}
            className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal transition-colors"
          >
            + Add Event
          </button>

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-12 text-charcoal/60">No events yet</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-cream-light p-4 border border-charcoal/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-charcoal-dark">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-charcoal/70 mt-1">{event.description}</p>
                      )}
                      <div className="text-xs text-charcoal/60 mt-2">
                        {formatDate(event.startDate)} → {formatDate(event.endDate)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEventModal(event)}
                        className="text-sm text-charcoal hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-sm text-charcoal-dark hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Team Tasks Tab */}
      {activeTab === 'team-tasks' && (
        <div className="space-y-4">
          <button
            onClick={() => openTeamTaskModal()}
            className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal transition-colors"
          >
            + Add Task
          </button>

          <div className="space-y-3">
            {teamTasks.length === 0 ? (
              <div className="text-center py-12 text-charcoal/60">No team tasks yet</div>
            ) : (
              teamTasks.map((task) => (
                <div key={task.id} className={`bg-cream-light p-4 border border-charcoal/10 ${task.completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTeamTask(task)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium text-charcoal-dark ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-charcoal/70 mb-2">{task.description}</p>
                      )}
                      <div className="text-xs text-charcoal/60">
                        {task.dueDate && `Due: ${formatDate(task.dueDate)}`}
                        {task.assignedUser && (
                          <span className="ml-3">Assigned to: {task.assignedUser.name || task.assignedUser.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openTeamTaskModal(task)}
                        className="text-sm text-charcoal hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTeamTask(task.id)}
                        className="text-sm text-charcoal-dark hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Personal Tasks Tab */}
      {activeTab === 'personal-tasks' && (
        <div className="space-y-4">
          <button
            onClick={() => openPersonalTaskModal()}
            className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal transition-colors"
          >
            + Add Task
          </button>

          <div className="space-y-3">
            {personalTasks.length === 0 ? (
              <div className="text-center py-12 text-charcoal/60">No personal tasks yet</div>
            ) : (
              personalTasks.map((task) => (
                <div key={task.id} className={`bg-cream-light p-4 border border-charcoal/10 ${task.completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => togglePersonalTask(task)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium text-charcoal-dark ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-charcoal/70 mb-2">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <div className="text-xs text-charcoal/60">
                          Due: {formatDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPersonalTaskModal(task)}
                        className="text-sm text-charcoal hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePersonalTask(task.id)}
                        className="text-sm text-charcoal-dark hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream p-6 max-w-md w-full">
            <h3 className="font-serif text-2xl text-charcoal-dark mb-4">
              {editingEvent ? 'Edit Event' : 'New Event'}
            </h3>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-charcoal mb-1">Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-charcoal mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>

              {/* Single Date Toggle */}
              <div>
                <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleDateMode}
                    onChange={(e) => setSingleDateMode(e.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  <span>Single date event</span>
                </label>
                <p className="text-xs text-charcoal/60 mt-1 ml-6">
                  {singleDateMode ? 'Event occurs on one day only' : 'Event spans multiple days'}
                </p>
              </div>

              <div className={`grid ${singleDateMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                <div>
                  <label className="block text-sm text-charcoal mb-1">{singleDateMode ? 'Date' : 'Start Date'} *</label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                  />
                </div>
                {!singleDateMode && (
                  <div>
                    <label className="block text-sm text-charcoal mb-1">End Date *</label>
                    <input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 border border-charcoal/30 text-charcoal hover:bg-charcoal/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Task Modal */}
      {showTeamTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream p-6 max-w-md w-full">
            <h3 className="font-serif text-2xl text-charcoal-dark mb-4">
              {editingTeamTask ? 'Edit Task' : 'New Team Task'}
            </h3>
            <form onSubmit={handleTeamTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-charcoal mb-1">Title *</label>
                <input
                  type="text"
                  value={teamTaskForm.title}
                  onChange={(e) => setTeamTaskForm({ ...teamTaskForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-charcoal mb-1">Description</label>
                <textarea
                  value={teamTaskForm.description}
                  onChange={(e) => setTeamTaskForm({ ...teamTaskForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-charcoal mb-1">Priority</label>
                  <select
                    value={teamTaskForm.priority}
                    onChange={(e) => setTeamTaskForm({ ...teamTaskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none appearance-none bg-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B6560%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-charcoal mb-1">Due Date</label>
                  <input
                    type="date"
                    value={teamTaskForm.dueDate}
                    onChange={(e) => setTeamTaskForm({ ...teamTaskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowTeamTaskModal(false)}
                  className="px-4 py-2 border border-charcoal/30 text-charcoal hover:bg-charcoal/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Personal Task Modal */}
      {showPersonalTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream p-6 max-w-md w-full">
            <h3 className="font-serif text-2xl text-charcoal-dark mb-4">
              {editingPersonalTask ? 'Edit Task' : 'New Personal Task'}
            </h3>
            <form onSubmit={handlePersonalTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-charcoal mb-1">Title *</label>
                <input
                  type="text"
                  value={personalTaskForm.title}
                  onChange={(e) => setPersonalTaskForm({ ...personalTaskForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-charcoal mb-1">Description</label>
                <textarea
                  value={personalTaskForm.description}
                  onChange={(e) => setPersonalTaskForm({ ...personalTaskForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-charcoal mb-1">Priority</label>
                  <select
                    value={personalTaskForm.priority}
                    onChange={(e) => setPersonalTaskForm({ ...personalTaskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none appearance-none bg-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B6560%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-charcoal mb-1">Due Date</label>
                  <input
                    type="date"
                    value={personalTaskForm.dueDate}
                    onChange={(e) => setPersonalTaskForm({ ...personalTaskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-charcoal/20 focus:border-charcoal focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPersonalTaskModal(false)}
                  className="px-4 py-2 border border-charcoal/30 text-charcoal hover:bg-charcoal/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-charcoal-dark text-cream hover:bg-charcoal disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
