import React from "react";
import { ArrowRight, BookOpen, GraduationCap, MapPin, Phone, ShieldCheck, Users } from "lucide-react";

export default function LandingPage({ onEnter }) {
  const highlights = [
    { title: "Academic Excellence", text: "A balanced curriculum that supports strong classroom learning and personal growth." },
    { title: "Boarding & Day Care", text: "Safe, structured boarding and day-scholar support from nursery to grade 10." },
    { title: "Holistic Development", text: "Focused on creativity, discipline, and responsible citizenship." },
  ];

  return (
    <div className="sm-landing-shell">
      <section className="sm-landing-hero">
        <div className="sm-landing-copy">
          <span className="sm-landing-badge">Private • Co-educational • Boarding & Day</span>
          <h1 className="sm-display">Malagiree English Boarding School</h1>
          <p>
            Located in Tahoon, Rambha-5, Palpa, Malagiree English Boarding School has been shaping young minds since 2044 BS.
            The school offers a caring environment for students from nursery to grade 10, combining academic strength with values and discipline.
          </p>
          <div className="sm-landing-actions">
            <button className="sm-btn sm-btn-gold" onClick={onEnter}>
              Enter admin portal <ArrowRight size={16} />
            </button>
            <a className="sm-btn sm-btn-ghost" href="/login">
              View login page
            </a>
          </div>
          <div className="sm-landing-stats">
            <div>
              <strong>139</strong>
              <span>Students</span>
            </div>
            <div>
              <strong>2044 BS</strong>
              <span>Established</span>
            </div>
            <div>
              <strong>Nursery-10</strong>
              <span>Grades</span>
            </div>
          </div>
        </div>
        <div className="sm-landing-card">
          <h3 className="sm-display">Why families choose us</h3>
          <ul>
            <li><ShieldCheck size={16} /> Safe and supportive learning environment</li>
            <li><GraduationCap size={16} /> Strong academic foundation</li>
            <li><Users size={16} /> Caring guidance for every learner</li>
            <li><BookOpen size={16} /> Balanced focus on knowledge and values</li>
          </ul>
        </div>
      </section>

      <section className="sm-landing-grid">
        {highlights.map((item) => (
          <article key={item.title} className="sm-landing-panel">
            <h4>{item.title}</h4>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="sm-landing-footer">
        <div className="sm-landing-foot-card">
          <MapPin size={18} />
          <div>
            <h4>Visit us</h4>
            <p>Tahoon, Rambha-5, Palpa</p>
          </div>
        </div>
        <div className="sm-landing-foot-card">
          <Phone size={18} />
          <div>
            <h4>Contact</h4>
            <p>+977 9847268377</p>
          </div>
        </div>
      </section>
    </div>
  );
}
