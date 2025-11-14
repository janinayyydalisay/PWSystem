// Activity Log Component
class ActivityLog {
    constructor(containerId, mode) {
        this.container = document.getElementById(containerId);
        this.mode = mode;
        this.init();
    }

    init() {
        this.loadActivities();
        // Refresh every 30 seconds
        setInterval(() => this.loadActivities(), 30000);
    }

    async loadActivities() {
        try {
            const response = await fetch(`/api/pump-activity?mode=${this.mode}`);
            const data = await response.json();
            
            if (data.success && data.activities) {
                this.renderActivities(data.activities);
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            this.showError();
        }
    }

    renderActivities(activities) {
        const countElement = document.getElementById(`${this.mode}Count`);
        if (countElement) {
            countElement.textContent = `${activities.length} activities`;
        }

        const html = activities.map(activity => this.createActivityCard(activity)).join('');
        this.container.innerHTML = html || this.getEmptyState();
    }

    createActivityCard(activity) {
        const config = this.getStatusConfig(activity.details?.status || 'OFF');
        return `
            <div class="flex items-center justify-between p-3 bg-gradient-to-r ${this.getModeGradient()} rounded-lg border theme-border hover:shadow-sm transition-all duration-200 group">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${config.bgClass} ${config.borderClass} border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <svg class="w-4 h-4 ${config.iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${config.icon}
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium flex items-center gap-2">
                            ${activity.details?.plantName || 'Unknown Plant'}
                            <span class="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${config.bgClass} ${config.textClass} ${config.borderClass} border">
                                ${activity.details?.status || 'OFF'}
                            </span>
                        </h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${this.formatTimestamp(activity.startTime)}
                        </p>
                        ${this.getAdditionalDetails(activity)}
                    </div>
                </div>
            </div>
        `;
    }

    getStatusConfig(status) {
        return {
            'ON': {
                bgClass: 'bg-green-100 dark:bg-green-900/30',
                textClass: 'text-green-800 dark:text-green-200',
                borderClass: 'border-green-200/50 dark:border-green-700/30',
                iconClass: 'text-green-500',
                icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
            },
            'OFF': {
                bgClass: 'bg-red-100 dark:bg-red-900/30',
                textClass: 'text-red-800 dark:text-red-200',
                borderClass: 'border-red-200/50 dark:border-red-700/30',
                iconClass: 'text-red-500',
                icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'
            }
        }[status];
    }

    getModeGradient() {
        const gradients = {
            'manual': 'from-cyan-50/80 to-transparent dark:from-cyan-900/20 dark:to-transparent',
            'automatic': 'from-orange-50/80 to-transparent dark:from-orange-900/20 dark:to-transparent',
            'scheduled': 'from-fuchsia-50/80 to-transparent dark:from-fuchsia-900/20 dark:to-transparent'
        };
        return gradients[this.mode] || gradients.manual;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    getAdditionalDetails(activity) {
        const details = activity.details || {};
        let additionalHtml = '';

        if (this.mode === 'automatic' && details.moistureLevel) {
            additionalHtml += `
                <div class="mt-2 flex items-center gap-2">
                    <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div class="bg-orange-400 h-1.5 rounded-full" style="width: ${details.moistureLevel}%"></div>
                    </div>
                    <span class="text-xs font-medium">${details.moistureLevel}%</span>
                </div>
            `;
        } else if (this.mode === 'scheduled' && details.scheduledTime) {
            additionalHtml += `
                <p class="text-xs text-gray-500 mt-1">
                    <span class="font-medium">Scheduled:</span> ${new Date(details.scheduledTime).toLocaleTimeString()}
                </p>
            `;
        }

        if (details.duration) {
            additionalHtml += `
                <p class="text-xs text-gray-500 mt-1">
                    <span class="font-medium">Duration:</span> ${details.duration} minutes
                </p>
            `;
        }

        return additionalHtml;
    }

    getEmptyState() {
        return `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No activities recorded yet</p>
            </div>
        `;
    }

    showError() {
        this.container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p>Failed to load activities</p>
            </div>
        `;
    }
}

// Export for use in other files
window.ActivityLog = ActivityLog;