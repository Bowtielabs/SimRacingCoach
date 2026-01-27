export class EventRouter {
    options;
    state = {
        lastEmittedAt: new Map(),
    };
    constructor(options) {
        this.options = options;
    }
    updateOptions(options) {
        this.options.focusMode = options.focusMode ?? this.options.focusMode;
    }
    route(events) {
        const routed = [];
        for (const event of events) {
            if (this.options.focusMode && event.severity !== 'CRITICAL') {
                continue;
            }
            const lastAt = this.state.lastEmittedAt.get(event.id) ?? 0;
            if (event.t - lastAt < event.cooldownMs) {
                continue;
            }
            this.state.lastEmittedAt.set(event.id, event.t);
            routed.push({
                event,
                shouldBarge: event.severity === 'CRITICAL',
            });
        }
        return routed;
    }
}
//# sourceMappingURL=router.js.map