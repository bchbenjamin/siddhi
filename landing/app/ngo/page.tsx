import type { Metadata } from "next";
import { NGO_SITE_URL } from "../../src/config";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { EyebrowLabel } from "../../src/components/EyebrowLabel";
import { SectionHeading } from "../../src/components/SectionHeading";
import "./ngo.css";

export const metadata: Metadata = {
  title: "Réussir Trust",
  description:
    "Learn about Réussir Trust, its work in inclusive education and educator development, and its connection with Siddhi.",
};

const impact = [
  { value: "9,500+", label: "Teachers trained" },
  { value: "50,000+", label: "Students impacted" },
  { value: "100+", label: "Workshops conducted" },
];

export default function NgoPage() {
  return (
    <>
      <section className="ngo-hero section--dark">
        <div className="page-container ngo-hero__inner">
          <div className="ngo-hero__copy">
            <EyebrowLabel>THE TRUST BEHIND SIDDHI</EyebrowLabel>
            <h1>Building inclusive education through empowered educators.</h1>
            <p>
              Réussir Trust is a Bangalore-based non-profit working to strengthen
              education by supporting children with learning challenges and
              developing educators at scale.
            </p>
            <span className="ngo-hero__translation">
              Réussir — French for “to succeed or triumph”.
            </span>
          </div>
          <div className="ngo-hero__art" aria-hidden="true">
            <div className="ngo-hero__art-ring ngo-hero__art-ring--outer" />
            <div className="ngo-hero__art-ring ngo-hero__art-ring--inner" />
            <div className="ngo-hero__art-core">
              <span>R</span>
              <small>RÉUSSIR TRUST</small>
            </div>
            <span className="ngo-hero__art-caption">LEARNING · INCLUSION · SKILLING</span>
          </div>
        </div>
        <div className="page-container ngo-hero__footnote">
          <span>BANGALORE, INDIA</span>
          <span>INCLUSIVE EDUCATION & SKILL DEVELOPMENT</span>
        </div>
      </section>

      <section className="section section--light ngo-story">
        <div className="page-container ngo-story__grid">
          <div>
            <SectionHeading
              eyebrow="THE STORY"
              title="From supporting children to strengthening the people who teach."
            />
          </div>
          <div className="ngo-story__copy">
            <p>
              Réussir Trust began by supporting children with learning
              challenges. Over time, its focus grew towards training educators
              at scale, recognising the role teachers play in making learning
              more inclusive.
            </p>
            <p>
              Working with existing education networks, the Trust aims to
              develop and share better practices in teaching, learning and
              skilling. Its teacher-training work spans Karnataka, Andhra
              Pradesh and Tamil Nadu.
            </p>
            <p>
              The organisation is led by its Founder and CEO, Dr. Shanthi Satish.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--dark ngo-impact">
        <div className="page-container">
          <SectionHeading
            eyebrow="WORK AT SCALE"
            title="A growing impact through educator development."
            description="Teacher-training impact reported by Réussir Trust across three states."
          />
          <div className="ngo-impact__grid">
            {impact.map((item, index) => (
              <Card key={item.label} tone="dark" className="ngo-impact__card">
                <span className="ngo-impact__index">0{index + 1}</span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </Card>
            ))}
          </div>
          <p className="ngo-impact__footnote">
            Reported figures supplied for this page; they are not Siddhi platform usage statistics.
          </p>
        </div>
      </section>

      <section className="section section--light ngo-purpose">
        <div className="page-container">
          <SectionHeading
            eyebrow="PURPOSE & DIRECTION"
            title="A mission rooted in shared practice."
            description="The Trust's mission and vision centre on inclusive education and skill development."
          />
          <div className="ngo-purpose__grid">
            <Card tone="light" className="ngo-purpose__card">
              <span className="ngo-purpose__label">01 / MISSION</span>
              <h3>Work with the networks already shaping education.</h3>
              <p>
                Work with existing education networks to develop and share best
                practices in teaching, learning and skilling.
              </p>
            </Card>
            <Card tone="peach" className="ngo-purpose__card">
              <span className="ngo-purpose__label">02 / VISION</span>
              <h3>Be a resource for inclusive education and skill development.</h3>
              <p>
                Be the best resource for skilling teachers, educators and
                students in inclusive education and skill development.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section section--dark ngo-siddhi">
        <div className="page-container ngo-siddhi__grid">
          <div>
            <SectionHeading
              eyebrow="WHY SIDDHI"
              title="Technology that supports the work around every learner."
            />
          </div>
          <div className="ngo-siddhi__copy">
            <p>
              Educators need practical ways to plan, document and review the
              individual support a learner receives. Siddhi brings IEP goals,
              progress, therapy, accommodations and reviews into one role-aware
              platform for special and inclusive schools.
            </p>
            <p>
              Its focus on coordinated records and individual learning plans
              complements Réussir Trust's work to strengthen inclusive
              education through educator development and shared practice.
            </p>
            <div className="ngo-siddhi__principles" aria-label="Siddhi platform focus">
              <span>INDIVIDUAL GOALS</span>
              <span>COORDINATED SUPPORT</span>
              <span>PROGRESS & REVIEW</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ngo-closing">
        <div className="page-container ngo-closing__inner">
          <div>
            <EyebrowLabel>LEARN MORE ABOUT THE TRUST</EyebrowLabel>
            <h2>Discover Réussir Trust's work.</h2>
            <p>Visit the official website to learn more about its programmes and initiatives.</p>
          </div>
          <Button
            href={NGO_SITE_URL}
            variant="primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Réussir Trust
          </Button>
        </div>
      </section>
    </>
  );
}
