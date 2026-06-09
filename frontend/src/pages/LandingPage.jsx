import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, FileText, Cpu, ShieldAlert, CheckCircle, ArrowRight, Activity, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { token } = useAuth();

  const features = [
    {
      icon: <Cpu className="h-6 w-6 text-sky-400" />,
      title: "RAG AI Processing",
      desc: "Retrieval-Augmented Generation processes and references matching paragraphs automatically for rich, hallucination-free chats."
    },
    {
      icon: <FileText className="h-6 w-6 text-sky-400" />,
      title: "Multi-Format Parser",
      desc: "Instant text indexing from standard PDF, DOCX, CSV tables, and plain txt files without external API reliance."
    },
    {
      icon: <Activity className="h-6 w-6 text-indigo-400" />,
      title: "Tesseract OCR Support",
      desc: "Scanned document pages and raw image logs are automatically processed using embedded OCR engines."
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-emerald-400" />,
      title: "Enterprise Encryption",
      desc: "JWT-based microservice security layers protect uploads, verifying all API tokens directly at the database layer."
    }
  ];

  const plans = [
    {
      name: "Developer Starter",
      price: "$0",
      desc: "Great for testing capabilities using free models.",
      features: [
        "Up to 10 active documents",
        "Max 5MB file upload limit",
        "Google Gemini API integration",
        "Standard sentence embedding index",
        "Self-serve API logs"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "SaaS Pro Plan",
      price: "$29",
      period: "/month",
      desc: "Unlock advanced features and high-throughput execution.",
      features: [
        "Up to 150 active documents",
        "Max 30MB file upload limit",
        "Advanced scanned OCR image parsing",
        "Multi-document combined RAG query",
        "24/7 dedicated email support",
        "Access to API keys configuration"
      ],
      cta: "Upgrade to Pro",
      popular: true
    },
    {
      name: "Enterprise Custom",
      price: "Custom",
      desc: "Scale limits and integrate custom server deployments.",
      features: [
        "Unlimited documents and index logs",
        "Dedicated container resources",
        "Custom vector DB configurations",
        "SAML SSO & OAuth controls",
        "1-on-1 architecture setup support"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header Bar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl shadow-lg shadow-sky-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">GotlrBot</span>
        </div>
        
        <div className="flex items-center gap-4">
          {token ? (
            <Link to="/dashboard" className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl shadow-lg shadow-sky-500/20 transition duration-200 flex items-center gap-2">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-slate-300 hover:text-white font-medium transition duration-200">
                Sign In
              </Link>
              <Link to="/register" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 hover:border-slate-600 transition duration-200">
                Create Account
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative flex-1 max-w-7xl mx-auto px-6 pt-16 pb-20 w-full flex flex-col items-center justify-center text-center z-10">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-glow" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-sky-950/60 border border-sky-500/30 rounded-full text-sky-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Zap className="h-3.5 w-3.5 fill-current" /> Next-Generation AI RAG Engine
        </div>

        <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
          Chat With Your Documents Using <br className="hidden md:inline" />
          <span className="text-glow-gradient">Context-Aware AI Assistants</span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-slate-400 font-normal leading-relaxed mb-10">
          Upload PDFs, DOCX files, scanned images, or CSV spreadsheets. GotlrBot automatically parses, indexes, and builds in-memory vector maps to deliver citation-accurate answers in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link to={token ? "/dashboard" : "/register"} className="w-full sm:w-auto px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white text-base font-semibold rounded-2xl shadow-xl shadow-sky-500/20 hover:shadow-sky-500/35 transform hover:-translate-y-0.5 transition duration-200 flex items-center justify-center gap-2">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
          <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-base font-semibold rounded-2xl border border-slate-800 hover:border-slate-700 transition duration-200 flex items-center justify-center">
            Learn More
          </a>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 w-full border-t border-slate-900">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Smarter Search</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">All the tools required to build context-aware database queries from your text resources.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <div key={idx} className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="p-3 bg-slate-900 w-fit rounded-xl border border-slate-800">
                {feat.icon}
              </div>
              <h3 className="font-bold text-lg text-white">{feat.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full border-t border-slate-900">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">Start for free and scale seamlessly as your document processing requirements expand.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <div key={idx} className={`relative rounded-3xl p-8 flex flex-col h-full transition duration-300 ${plan.popular ? 'bg-slate-900 border-2 border-sky-500 shadow-2xl shadow-sky-500/10' : 'bg-slate-900/40 border border-slate-900'}`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2 text-white">{plan.name}</h3>
              <p className="text-slate-400 text-sm min-h-[40px] mb-6">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl md:text-5xl font-extrabold text-white">{plan.price}</span>
                {plan.period && <span className="text-slate-400 font-medium">{plan.period}</span>}
              </div>
              
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle className="h-4.5 w-4.5 text-sky-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link to={token ? "/dashboard" : "/register"} className={`w-full py-3.5 rounded-xl font-semibold text-center transition duration-200 ${plan.popular ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6">
          <p>© {new Date().getFullYear()} GotlrBot AI Platform. Built using React, Django, FastAPI, and PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
