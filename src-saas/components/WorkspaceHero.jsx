import WorkspaceLinks from "./WorkspaceLinks";

function WorkspaceHero({ eyebrow, title, description, actions = null }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-7">
        <div className="flex flex-col gap-6">
          <WorkspaceLinks />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-2 text-2xl font-black leading-tight text-stone-900 sm:text-3xl lg:text-4xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
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
