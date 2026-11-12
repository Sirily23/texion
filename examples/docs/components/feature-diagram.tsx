type Feature = 'cancel' | 'local' | 'formats' | 'preview' | 'submit';

const descriptions: Record<Feature, string> = {
  cancel: 'A removed file is cancelled while the message draft stays intact.',
  local: 'A document becomes extracted text inside the browser.',
  formats: 'PDF, DOCX, and CSV feed into one shared document shape.',
  preview:
    'Untrusted content passes through preview safeguards before display.',
  submit: 'Submission waits for processing files to become ready.',
};

export function FeatureDiagram({ kind }: { kind: Feature }) {
  return (
    <svg
      className="feature-diagram"
      viewBox="0 0 440 240"
      role="img"
      aria-label={descriptions[kind]}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'cancel' && (
        <>
          <rect
            className="diagram-surface"
            x="55"
            y="27"
            width="330"
            height="186"
            rx="20"
          />
          <path className="diagram-muted" d="M80 58h144m-144 12h96" />
          <rect
            className="diagram-muted"
            x="80"
            y="92"
            width="280"
            height="43"
            rx="10"
            strokeDasharray="4 5"
          />
          <text className="diagram-muted" x="96" y="118">
            report.pdf
          </text>
          <path className="diagram-muted" d="m333 108 10 10m0-10-10 10" />
          <rect
            className="diagram-accent-fill"
            x="80"
            y="148"
            width="280"
            height="39"
            rx="10"
          />
          <path className="diagram-accent" d="m96 168 5 5 9-10" />
          <text x="124" y="173">
            Your draft stays here.
          </text>
        </>
      )}
      {kind === 'local' && (
        <>
          <rect
            className="diagram-surface"
            x="40"
            y="27"
            width="360"
            height="186"
            rx="20"
          />
          <path className="diagram-muted" d="M40 63h360" />
          <circle className="diagram-muted" cx="59" cy="45" r="2" />
          <circle className="diagram-muted" cx="70" cy="45" r="2" />
          <circle className="diagram-muted" cx="81" cy="45" r="2" />
          <text className="diagram-muted" x="220" y="49" textAnchor="middle">
            YOUR BROWSER
          </text>
          <rect x="84" y="88" width="63" height="78" rx="8" />
          <path className="diagram-muted" d="M98 111h32m-32 12h32m-32 12h22" />
          <path className="diagram-accent" d="M172 128h77m-7-7 7 7-7 7" />
          <rect
            className="diagram-accent-fill"
            x="275"
            y="88"
            width="80"
            height="78"
            rx="8"
          />
          <path
            className="diagram-accent"
            d="M290 111h50m-50 12h50m-50 12h35"
          />
          <text className="diagram-muted" x="116" y="188" textAnchor="middle">
            File
          </text>
          <text className="diagram-muted" x="315" y="188" textAnchor="middle">
            Text
          </text>
        </>
      )}
      {kind === 'formats' && (
        <>
          {['PDF', 'DOCX', 'CSV'].map((format, index) => (
            <g key={format} transform={`translate(52 ${37 + index * 61})`}>
              <rect className="diagram-surface" width="86" height="43" rx="9" />
              <text x="43" y="27" textAnchor="middle">
                {format}
              </text>
            </g>
          ))}
          <path
            className="diagram-muted"
            d="M138 58h37q12 0 12 12v100q0 12-12 12h-37m0-63h102"
          />
          <path className="diagram-accent" d="m233 112 7 7-7 7" />
          <rect
            className="diagram-accent-fill"
            x="263"
            y="66"
            width="125"
            height="108"
            rx="14"
          />
          <text className="diagram-accent" x="279" y="94">
            document
          </text>
          <text className="diagram-muted" x="279" y="119">
            text
          </text>
          <text className="diagram-muted" x="279" y="138">
            status
          </text>
          <text className="diagram-muted" x="279" y="157">
            metadata
          </text>
        </>
      )}
      {kind === 'preview' && (
        <>
          <rect
            className="diagram-surface"
            x="50"
            y="48"
            width="124"
            height="144"
            rx="14"
          />
          <text className="diagram-muted" x="68" y="78">
            SOURCE
          </text>
          <path className="diagram-muted" d="M68 99h77m-77 12h58" />
          <text className="diagram-muted" x="68" y="144">
            {'<script>'}
          </text>
          <path className="diagram-muted" d="M67 139h84" />
          <path className="diagram-accent" d="M190 120h57m-7-7 7 7-7 7" />
          <rect
            className="diagram-accent-fill"
            x="264"
            y="48"
            width="126"
            height="144"
            rx="14"
          />
          <text className="diagram-accent" x="281" y="78">
            PREVIEW
          </text>
          <path d="M281 101h76m-76 17h62" />
          <path className="diagram-muted" d="M281 137h88m-88 12h88m-88 12h55" />
        </>
      )}
      {kind === 'submit' && (
        <>
          <rect
            className="diagram-surface"
            x="48"
            y="45"
            width="344"
            height="150"
            rx="18"
          />
          <text className="diagram-muted" x="70" y="76">
            ATTACHMENTS
          </text>
          <path
            className="diagram-accent"
            d="m71 100 5 5 9-10m-14 38 5 5 9-10"
          />
          <text x="99" y="105">
            notes.txt
          </text>
          <text x="99" y="138">
            report.pdf
          </text>
          <path className="diagram-muted" d="M99 157h116" />
          <path className="diagram-accent" d="M99 157h89" strokeWidth="3" />
          <rect
            className="diagram-accent-fill"
            x="266"
            y="94"
            width="104"
            height="48"
            rx="24"
          />
          <text className="diagram-accent" x="318" y="123" textAnchor="middle">
            Wait → send
          </text>
          <text className="diagram-muted" x="318" y="166" textAnchor="middle">
            When ready
          </text>
        </>
      )}
    </svg>
  );
}
