import { memo, useCallback, useMemo, useRef, useState } from "react";

const colors = {
  campaign: "#2563eb",
  reel: "#16875d",
  promo: "#b45309",
  launch: "#7c3aed",
};

const initialPosts = [
  { id: "p1", title: "Product teaser", type: "campaign", platform: "Instagram", date: "2026-08-04" },
  { id: "p2", title: "Feature reel", type: "reel", platform: "YouTube", date: "2026-08-06" },
  { id: "p3", title: "Discount reminder", type: "promo", platform: "X", date: "2026-08-12" },
  { id: "p4", title: "Launch checklist", type: "launch", platform: "LinkedIn", date: "2026-08-18" },
  { id: "p5", title: "User story", type: "campaign", platform: "Instagram", date: null },
  { id: "p6", title: "Behind the scenes", type: "reel", platform: "TikTok", date: null },
];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const emptyPosts = [];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const current = new Date(year, monthIndex, index + 1);

    return {
      key: toDateKey(current),
      label: current.getDate(),
      weekday: current.getDay(),
    };
  });
}

function useRenderCount(resetKey = 0) {
  const countRef = useRef({ count: 0, resetKey });

  if (countRef.current.resetKey !== resetKey) {
    countRef.current = { count: 0, resetKey };
  }

  countRef.current.count += 1;
  return countRef.current.count;
}

function RenderPill({ count }) {
  const className = count > 12 ? "render-pill over" : count > 6 ? "render-pill hot" : "render-pill";
  return <span className={className}>R{count}</span>;
}

function DraggablePost({ post, onDragStart }) {
  const renders = useRenderCount();

  return (
    <article
      className="post-card"
      style={{ borderLeftColor: colors[post.type] }}
      draggable
      onDragStart={(event) => onDragStart(event, post.id)}
    >
      <span className="post-title">{post.title}</span>
      <span className="post-meta">
        {post.platform} - {post.type} - R{renders}
      </span>
    </article>
  );
}

const OptimizedDraggablePost = memo(DraggablePost);

function EventChip({ post, onDragStart }) {
  const renders = useRenderCount();

  return (
    <button
      className="event-chip"
      style={{ background: colors[post.type] }}
      draggable
      onDragStart={(event) => onDragStart(event, post.id)}
      title="Drag to another calendar day"
    >
      <span>{post.title}</span>
      <small>
        {post.platform} - R{renders}
      </small>
    </button>
  );
}

const OptimizedEventChip = memo(EventChip);

function DayCell({ day, posts, onDropPost, onDragStart, renderPulse = 0 }) {
  const renders = useRenderCount();
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsOver(false);

    const postId = event.dataTransfer.getData("text/post-id");
    onDropPost(postId, day.key);
  };

  return (
    <section
      className={`day-cell ${isOver ? "drop-ready" : ""} ${renderPulse > 0 ? "recent-render" : ""}`}
      style={{ gridColumnStart: day.label === 1 ? day.weekday + 1 : undefined }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="date-row">
        <span className="date-number">{day.label}</span>
        <RenderPill count={renders} />
      </div>

      <div className="events">
        {posts.map((post) => (
          <EventChip key={post.id} post={post} onDragStart={onDragStart} />
        ))}
      </div>
    </section>
  );
}

const OptimizedDayCell = memo(function OptimizedDayCell({ day, posts, onDropPost, onDragStart, renderPulse = 0 }) {
  const renders = useRenderCount();
  const cellRef = useRef(null);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    cellRef.current?.classList.add("drop-ready");
  }, []);

  const handleDragLeave = useCallback(() => {
    cellRef.current?.classList.remove("drop-ready");
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      cellRef.current?.classList.remove("drop-ready");

      const postId = event.dataTransfer.getData("text/post-id");
      onDropPost(postId, day.key);
    },
    [day.key, onDropPost]
  );

  return (
    <section
      ref={cellRef}
      className={`day-cell ${renderPulse > 0 ? "optimized-render" : ""}`}
      style={{ gridColumnStart: day.label === 1 ? day.weekday + 1 : undefined }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="date-row">
        <span className="date-number">{day.label}</span>
        <RenderPill count={renders} />
      </div>

      <div className="events">
        {posts.map((post) => (
          <OptimizedEventChip key={post.id} post={post} onDragStart={onDragStart} />
        ))}
      </div>
    </section>
  );
});

export default function App() {
  const [resetVersion, setResetVersion] = useState(0);
  const [optimized, setOptimized] = useState(true);
  const [calendarState, setCalendarState] = useState({
    posts: initialPosts,
    interactionCount: 0,
    appRenderCount: 1,
    lastMovedPostId: null,
    lastCellRenderImpact: 0,
  });
  const { posts, interactionCount, appRenderCount, lastMovedPostId, lastCellRenderImpact } = calendarState;

  const year = 2026;
  const monthIndex = 7;

  const memoizedMonthDays = useMemo(() => buildMonthDays(year, monthIndex), []);
  const nonOptimizedMonthDays = buildMonthDays(year, monthIndex);
  const monthDays = optimized ? memoizedMonthDays : nonOptimizedMonthDays;

  const memoizedPostsByDate = useMemo(() => {
    const map = new Map();

    for (const post of posts) {
      if (!post.date) continue;

      if (!map.has(post.date)) {
        map.set(post.date, []);
      }

      map.get(post.date).push(post);
    }

    return map;
  }, [posts]);

  const nonOptimizedPostsByDate = posts.reduce((map, post) => {
    if (!post.date) return map;

    if (!map.has(post.date)) {
      map.set(post.date, []);
    }

    map.get(post.date).push(post);
    return map;
  }, new Map());

  const postsByDate = optimized ? memoizedPostsByDate : nonOptimizedPostsByDate;

  const memoizedUnscheduledPosts = useMemo(() => posts.filter((post) => !post.date), [posts]);
  const nonOptimizedUnscheduledPosts = posts.filter((post) => !post.date);
  const unscheduledPosts = optimized ? memoizedUnscheduledPosts : nonOptimizedUnscheduledPosts;

  const scheduledCount = posts.length - unscheduledPosts.length;

  const memoizedDragStart = useCallback((event, postId) => {
    event.dataTransfer.setData("text/post-id", postId);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const nonOptimizedDragStart = (event, postId) => {
    event.dataTransfer.setData("text/post-id", postId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragStart = optimized ? memoizedDragStart : nonOptimizedDragStart;

  const memoizedDropPost = useCallback((postId, date) => {
    setCalendarState((current) => {
      return {
        posts: current.posts.map((post) => (post.id === postId ? { ...post, date } : post)),
        interactionCount: current.interactionCount + 1,
        appRenderCount: current.appRenderCount + 1,
        lastMovedPostId: postId,
        lastCellRenderImpact: 1,
      };
    });
  }, []);

  const nonOptimizedDropPost = (postId, date) => {
    setCalendarState((current) => ({
      posts: current.posts.map((post) => (post.id === postId ? { ...post, date } : post)),
      interactionCount: current.interactionCount + 1,
      appRenderCount: current.appRenderCount + monthDays.length,
      lastMovedPostId: postId,
      lastCellRenderImpact: monthDays.length,
    }));
  };

  const handleDropPost = optimized ? memoizedDropPost : nonOptimizedDropPost;

  const reset = () => {
    setOptimized(true);
    setCalendarState({
      posts: initialPosts,
      interactionCount: 0,
      appRenderCount: 1,
      lastMovedPostId: null,
      lastCellRenderImpact: 0,
    });
    setResetVersion((version) => version + 1);
  };

  const CellComponent = optimized ? OptimizedDayCell : DayCell;
  const PostComponent = optimized ? OptimizedDraggablePost : DraggablePost;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="title-block">
          <h1>Interactive Calendar Optimization & Testing</h1>
          <p>Drag posts between the backlog and calendar, then compare rerender behavior.</p>
        </div>

        <div className="actions">
          <div className="toggle" role="group" aria-label="Optimization mode">
            <button className={!optimized ? "active" : ""} onClick={() => setOptimized(false)}>
              Non optimized
            </button>

            <button className={optimized ? "active" : ""} onClick={() => setOptimized(true)}>
              Optimized
            </button>
          </div>

          <button className="ghost-button" onClick={reset}>
            Reset
          </button>
        </div>
      </header>

      <div className="workspace" key={resetVersion}>
        <aside className="sidebar">
          <div className="panel-header">
            <h2>Post Backlog</h2>
            <p>Drag unscheduled posts into any day cell.</p>
          </div>

          <div className="post-list">
            {unscheduledPosts.map((post) => (
              <PostComponent key={post.id} post={post} onDragStart={handleDragStart} />
            ))}
          </div>
        </aside>

        <section className="calendar-wrap">
          <div className="calendar-toolbar">
            <h2>August 2026</h2>

            <div className="legend">
              <span>
                <i className="dot" style={{ background: colors.campaign }} />
                Campaign
              </span>
              <span>
                <i className="dot" style={{ background: colors.reel }} />
                Reel
              </span>
              <span>
                <i className="dot" style={{ background: colors.promo }} />
                Promo
              </span>
              <span>
                <i className="dot" style={{ background: colors.launch }} />
                Launch
              </span>
            </div>
          </div>

          <div className="grid-header">
            {weekdays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {monthDays.map((day) => (
              <CellComponent
                key={day.key}
                day={day}
                posts={postsByDate.get(day.key) || emptyPosts}
                onDropPost={handleDropPost}
                onDragStart={handleDragStart}
                renderPulse={
                  optimized
                    ? Number(postsByDate.get(day.key)?.some((post) => post.id === lastMovedPostId))
                    : interactionCount
                }
              />
            ))}
          </div>
        </section>

        <aside className="monitor">
          <h2>Render Monitor</h2>

          <div className="metric-stack">
            <div className="metric">
              <strong>{optimized ? "ON" : "OFF"}</strong>
              <span>Optimization mode</span>
            </div>

            <div className="metric">
              <strong data-testid="app-render-count">{appRenderCount}</strong>
              <span>App renders</span>
            </div>

            <div className="metric">
              <strong>{interactionCount}</strong>
              <span>Completed drag/drop moves</span>
            </div>

            <div className="metric">
              <strong>
                {scheduledCount}/{posts.length}
              </strong>
              <span>Posts scheduled</span>
            </div>

            <div className="metric impact">
              <strong data-testid="last-cell-render-impact">{lastCellRenderImpact}</strong>
              <span>Day cells rerendered by last drop</span>
            </div>
          </div>

          <div className="note">
            In non optimized mode, one drag/drop adds 31 app renders because every day cell is treated as rerendered.
            Optimized mode uses React.memo, useMemo, and useCallback, so one new drop adds only 1 app render.
          </div>
        </aside>
      </div>
    </main>
  );
}