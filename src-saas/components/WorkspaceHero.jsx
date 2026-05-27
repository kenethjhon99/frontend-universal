import WorkspaceLinks from "./WorkspaceLinks";

function WorkspaceHero({ eyebrow, title, description, actions = null }) {
  return (
    <section className="border-b border-stone-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6">
          <WorkspaceLinks />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-3 text-4xl font-black text-stone-900">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-500">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceHero;
