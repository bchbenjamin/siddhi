import type { Metadata } from "next";
import { SIDDHI_PLATFORM_URL } from "../src/config";
import { Badge } from "../src/components/Badge";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { EyebrowLabel } from "../src/components/EyebrowLabel";
import { SectionHeading } from "../src/components/SectionHeading";
import "./page.css";

export const metadata: Metadata = {
  title: "Siddhi | IEP Tracking Platform",
  description:
    "Siddhi brings student goals, progress, therapy, accommodations and reviews into one IEP tracking platform for special and inclusive schools in India.",
};

const audiences = [
  {
    title: "Special and inclusive schools",
    description: "Bring student plans, classroom support and reviews into one coordinated process.",
  },
  {
    title: "Educators and specialists",
    description: "Support special educators, therapists, psychologists and other school professionals.",
  },
  {
    title: "Families and caregivers",
    description: "Keep parent and guardian communication records connected to each child's plan.",
  },
  {
    title: "Education organisations",
    description: "Support resource rooms, early-intervention centres, NGOs and rehabilitation institutions.",
  },
];

const capabilities = [
  {
    number: "01",
    title: "Student profiles",
    description: "Keep student information, strengths, areas of need, learning style and assistive devices together.",
  },
  {
    number: "02",
    title: "Present Level of Performance",
    description: "Record current performance and assessment methods across nine developmental and learning domains.",
  },
  {
    number: "03",
    title: "IEP goals and objectives",
    description: "Plan annual goals and short-term objectives around each student's individual needs.",
  },
  {
    number: "04",
    title: "Progress monitoring",
    description: "Follow goal progress by term with scoring, graphs and performance indicators.",
  },
  {
    number: "05",
    title: "Therapy and support",
    description: "Record speech, occupational and physical therapy, behaviour support and counselling sessions.",
  },
  {
    number: "06",
    title: "Accommodations",
    description: "Document classroom and examination adjustments, learning materials and assistive technology.",
  },
  {
    number: "07",
    title: "Family communication",
    description: "Keep records of parent and guardian meetings, calls, feedback and engagement.",
  },
  {
    number: "08",
    title: "Assessments and attendance",
    description: "Maintain assessment records and attendance information alongside the student's plan.",
  },
  {
    number: "09",
    title: "Reviews and approvals",
    description: "Coordinate IEP reviews, review schedules and approvals from relevant team members.",
  },
  {
    number: "10",
    title: "Reports",
    description: "Prepare term-wise progress reports and export reports in Excel and PDF formats.",
  },
];

const domains = [
  "Academic",
  "Communication",
  "Social skills",
  "Behaviour",
  "Motor",
  "Cognitive",
  "Daily living",
  "Emotional development",
  "Vocational",
];

const steps = [
  {
    number: "01",
    title: "Create a student profile",
    description: "Bring key student information, strengths and areas of need into one profile.",
  },
  {
    number: "02",
    title: "Assess and set goals",
    description: "Record present levels of performance, then define annual goals and short-term objectives.",
  },
  {
    number: "03",
    title: "Track progress and therapy",
    description: "Monitor progress by term and record therapy, accommodations and communication.",
  },
  {
    number: "04",
    title: "Review and report",
    description: "Bring the team together for IEP reviews, approvals and progress reporting.",
  },
];

const policies = [
  "RPwD Act 2016",
  "NEP 2020",
  "SDG 4",
  "NIPUN Bharat",
  "CBSE Inclusive Education Guidelines",
];

export default function HomePage() {
  return (
    <>
      <section className="product-hero section--dark">
        <div className="page-container product-hero__inner">
          <div className="product-hero__copy">
            <EyebrowLabel>IEP TRACKING PLATFORM</EyebrowLabel>
            <h1>Every child’s learning journey, in one place.</h1>
            <p className="product-hero__description">
              Siddhi brings individual goals, progress, therapy, accommodations
              and reviews together in one role-aware IEP tracking platform for
              special and inclusive schools in India.
            </p>
            <div className="product-hero__actions">
              <Button href={SIDDHI_PLATFORM_URL} variant="primary">
                Sign in to Siddhi
              </Button>
              <span className="product-hero__supporting">
                Created with Réussir Trust
              </span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Illustrative preview of IEP tracking information">
            <div className="hero-visual__topline">
              <span>SIDDHI / IEP OVERVIEW</span>
              <Badge surface="dark">Illustrative</Badge>
            </div>
            <div className="hero-visual__profile">
              <div className="hero-visual__avatar" aria-hidden="true">S</div>
              <div>
                <p className="hero-visual__eyebrow">STUDENT PROFILE</p>
                <p className="hero-visual__student">Sample student</p>
                <p className="hero-visual__muted">Individual learning plan</p>
              </div>
            </div>
            <div className="hero-visual__rule" />
            <div className="hero-visual__summary">
              <div>
                <span className="hero-visual__eyebrow">IEP GOALS</span>
                <strong>Annual goals</strong>
              </div>
              <div>
                <span className="hero-visual__eyebrow">REVIEW</span>
                <strong>Term review</strong>
              </div>
            </div>
            <div className="hero-visual__progress">
              <div className="hero-visual__progress-heading">
                <span>Progress monitoring</span>
                <span>Illustrative view</span>
              </div>
              <div className="hero-visual__progress-track"><span /></div>
              <div className="hero-visual__progress-labels">
                <span>Goal tracking</span>
                <span>By term</span>
              </div>
            </div>
            <p className="hero-visual__disclaimer">
              Illustrative interface preview. Not a live student record.
            </p>
          </div>
        </div>
        <div className="product-hero__bottomline" aria-hidden="true">
          <span>PLAN</span><span>SUPPORT</span><span>MONITOR</span><span>REVIEW</span>
        </div>
      </section>

      <section className="section section--light problem-section">
        <div className="page-container problem-grid">
          <div className="problem-section__heading">
            <SectionHeading
              eyebrow="THE CHALLENGE"
              title="A child's plan should not be scattered across files."
            />
          </div>
          <div className="problem-section__copy">
            <p>
              Individualised support involves goals, assessments, progress
              notes, therapy records, accommodations and regular reviews.
              When these details sit across separate paper records and
              spreadsheets, it becomes harder for the people supporting a
              child to see the whole picture.
            </p>
            <p>
              Siddhi is designed to bring those parts of the IEP process
              together, so school teams can plan, document, monitor and review
              in one role-aware system.
            </p>
            <div className="problem-callout">
              <span className="problem-callout__mark" aria-hidden="true">“</span>
              <p>One connected view of each child's goals, support and progress.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--dark audience-section">
        <div className="page-container">
          <SectionHeading
            eyebrow="WHO IT SUPPORTS"
            title="A shared view for everyone involved."
            description="Siddhi is intended for the wider team around a child's learning and development."
          />
          <div className="audience-grid">
            {audiences.map((item, index) => (
              <Card key={item.title} tone="dark" className="audience-card">
                <span className="audience-card__number">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--light capabilities-section">
        <div className="page-container">
          <SectionHeading
            eyebrow="THE PLATFORM"
            title="The IEP process, connected end to end."
            description="A set of connected capabilities for planning, delivering and reviewing individualised support."
          />
          <div className="capability-grid">
            {capabilities.map((item) => (
              <Card key={item.number} tone={Number(item.number) % 3 === 0 ? "peach" : "light"} className="capability-card">
                <span className="capability-card__number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </Card>
            ))}
          </div>
          <div className="domain-panel">
            <div className="domain-panel__intro">
              <EyebrowLabel>PRESENT LEVEL OF PERFORMANCE</EyebrowLabel>
              <h3>Nine domains. A fuller picture.</h3>
              <p>Record current performance and assessment methods across these areas.</p>
            </div>
            <ul className="domain-list">
              {domains.map((domain) => <li key={domain}>{domain}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section--dark workflow-section">
        <div className="page-container">
          <SectionHeading
            eyebrow="HOW IT WORKS"
            title="From the first profile to the next review."
            description="A practical sequence that keeps the IEP cycle connected."
          />
          <ol className="workflow-list">
            {steps.map((step, index) => (
              <li className="workflow-step" key={step.number}>
                <span className="workflow-step__number">{step.number}</span>
                <div className="workflow-step__content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                {index < steps.length - 1 ? <span className="workflow-step__connector" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--light preview-section">
        <div className="page-container">
          <SectionHeading
            eyebrow="A CLOSER LOOK"
            title="Information that belongs together."
            description="These illustrative mock-ups show the kinds of records Siddhi is designed to organise. They are not live platform data."
          />
          <div className="preview-grid">
            <Card tone="light" className="preview-card">
              <div className="preview-card__header">
                <span>STUDENT PROFILE</span>
                <Badge surface="light">Illustrative</Badge>
              </div>
              <div className="preview-profile">
                <div className="preview-profile__avatar" aria-hidden="true">S</div>
                <div>
                  <strong>Sample student</strong>
                  <span>Student information</span>
                </div>
              </div>
              <div className="preview-detail-row"><span>Strengths</span><strong>Profile notes</strong></div>
              <div className="preview-detail-row"><span>Areas of need</span><strong>Assessment records</strong></div>
              <div className="preview-detail-row"><span>Assistive devices</span><strong>Support information</strong></div>
              <p className="preview-card__note">Illustrative layout · No real student data</p>
            </Card>
            <Card tone="peach" className="preview-card">
              <div className="preview-card__header">
                <span>GOALS & PROGRESS</span>
                <Badge surface="light">Illustrative</Badge>
              </div>
              <div className="preview-goal">
                <span className="preview-goal__label">ANNUAL GOAL</span>
                <strong>Individual learning objective</strong>
                <p>Short-term objectives linked to a student's present level of performance.</p>
              </div>
              <div className="preview-detail-row"><span>Progress period</span><strong>Term-wise</strong></div>
              <div className="preview-detail-row"><span>Monitoring</span><strong>Recorded progress</strong></div>
              <p className="preview-card__note">Illustrative layout · Not a performance claim</p>
            </Card>
            <Card tone="light" className="preview-card">
              <div className="preview-card__header">
                <span>SUPPORT & REVIEW</span>
                <Badge surface="light">Illustrative</Badge>
              </div>
              <div className="preview-review-row">
                <span className="preview-review-icon" aria-hidden="true">T</span>
                <div><strong>Therapy session</strong><span>Session record</span></div>
              </div>
              <div className="preview-review-row">
                <span className="preview-review-icon" aria-hidden="true">A</span>
                <div><strong>Accommodation</strong><span>Support adjustment</span></div>
              </div>
              <div className="preview-review-row">
                <span className="preview-review-icon" aria-hidden="true">R</span>
                <div><strong>IEP review</strong><span>Review and approval record</span></div>
              </div>
              <p className="preview-card__note">Illustrative layout · No real records</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section section--dark policy-section">
        <div className="page-container policy-layout">
          <div>
            <SectionHeading
              eyebrow="POLICY ALIGNMENT"
              title="Designed in the context of inclusive education."
              description="Siddhi's intended approach is aligned with the following Indian education and inclusion frameworks."
            />
          </div>
          <ul className="policy-list">
            {policies.map((policy, index) => (
              <li key={policy}>
                <span>0{index + 1}</span>
                <strong>{policy}</strong>
              </li>
            ))}
          </ul>
          <p className="policy-note">Alignment is not a claim of certification or government endorsement.</p>
        </div>
      </section>

      <section className="closing-band">
        <div className="page-container closing-band__inner">
          <div>
            <EyebrowLabel>THE NEXT STEP</EyebrowLabel>
            <h2>Bring the IEP journey into one view.</h2>
            <p>Sign in to access the Siddhi platform.</p>
          </div>
          <Button href={SIDDHI_PLATFORM_URL} variant="nav">
            Sign in to Siddhi
          </Button>
        </div>
      </section>
    </>
  );
}
