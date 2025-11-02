"use client"

import { useState, useEffect } from "react"
import { Menu, X, Phone, Instagram, Facebook, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Translations {
  [key: string]: {
    nav: {
      home: string
      about: string
      products: string
      contact: string
    }
    hero: {
      title: string
      subtitle: string
      description: string
      cta: string
    }
    about: {
      title: string
      features: {
        hygienic: string
        moisturizing: string
        economical: string
        unique: string
      }
    }
    products: {
      title: string
      description: string
      sizes: string
      available: string
    }
    contact: {
      title: string
      phones: string
      email: string
    }
    footer: {
      followUs: string
    }
  }
}

const translations: Translations = {
  ru: {
    nav: {
      home: "Главная",
      about: "О нас",
      products: "Наша продукция",
      contact: "Контакты",
    },
    hero: {
      title: "LUVRA",
      subtitle: "Премиальное жидкое мыло",
      description:
        "LUVRA — это не просто уход, а ритуал изысканности и красоты. Гармония нежных ароматов и шелковистая мягкая текстура превращают каждое мытье в незабываемый момент.",
      cta: "Узнать больше",
    },
    about: {
      title: "О нас",
      features: {
        hygienic: "Гигиенический состав",
        moisturizing: "Увлажняющий эффект",
        economical: "Экономичная и премиальная упаковка",
        unique: "Неповторимый аромат",
      },
    },
    products: {
      title: "Наша продукция",
      description:
        "В настоящее время LUVRA представлена в двух изысканных ароматах — каждый пробуждает свое особое настроение и состояние души.",
      sizes: "Доступные объемы: 490 мл и 900 мл",
      available: "Для вашего удобства",
    },
    contact: {
      title: "Контакты",
      phones: "Телефоны:",
      email: "Email:",
    },
    footer: {
      followUs: "Следите за нами",
    },
  },
  uz: {
    nav: {
      home: "Bosh sahifa",
      about: "Biz haqimizda",
      products: "Mahsulotlarimiz",
      contact: "Aloqa",
    },
    hero: {
      title: "LUVRA",
      subtitle: "Premium suyuq sovun",
      description:
        "Luvra — bu oddiy parvarish emas, balki nafislik va go'zallik marosimi. Nozik hidlar uyg'unligi va ipakdek yumshoq tuzilishi har bir yuvinish jarayonini unutilmas lahzaga aylantiradi.",
      cta: "Batafsil",
    },
    about: {
      title: "Biz haqimizda",
      features: {
        hygienic: "Gigiyenik tarkib",
        moisturizing: "Namlantiruvchi effekt",
        economical: "Tejamkor va premium qadoq",
        unique: "Betakror ifor",
      },
    },
    products: {
      title: "Mahsulotlarimiz",
      description:
        "Zamonaviy texnologiyalar hamda sinchkovlik bilan tanlangan tarkibiy qismlar teriga muloyimlik, yorqinlik va yengillik hissini bag'ishlaydi.",
      sizes: "Mavjud hajmlar: 490 ml va 900 ml",
      available: "Sizlarga qulay bo'lishi uchun",
    },
    contact: {
      title: "Aloqa",
      phones: "Telefonlar:",
      email: "Email:",
    },
    footer: {
      followUs: "Bizni kuzatib boring",
    },
  },
}

export default function LuvraLanding() {
  const [language, setLanguage] = useState<"ru" | "uz">("ru")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")

  const t = translations[language]

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "about", "products", "contact"]
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const offsetTop = element.offsetTop
          const offsetHeight = element.offsetHeight

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-2xl font-bold text-primary"><img src="/images/logo.png" alt="logo" className="w-32 md:w-24 h-auto"/> </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("home")}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  activeSection === "home" ? "text-primary" : "text-foreground"
                }`}
              >
                {t.nav.home}
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  activeSection === "about" ? "text-primary" : "text-foreground"
                }`}
              >
                {t.nav.about}
              </button>
              <button
                onClick={() => scrollToSection("products")}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  activeSection === "products" ? "text-primary" : "text-foreground"
                }`}
              >
                {t.nav.products}
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  activeSection === "contact" ? "text-primary" : "text-foreground"
                }`}
              >
                {t.nav.contact}
              </button>
            </nav>

            {/* Language Switcher & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLanguage("ru")}
                  className={`px-2 py-1 text-sm rounded ${
                    language === "ru" ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary"
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => setLanguage("uz")}
                  className={`px-2 py-1 text-sm rounded ${
                    language === "uz" ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary"
                  }`}
                >
                  UZ
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-background border-b border-border transition-transform duration-300 ${
            mobileMenuOpen ? "mobile-menu-open" : "mobile-menu-closed"
          }`}
        >
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <button
              onClick={() => scrollToSection("home")}
              className="block w-full text-left py-2 text-foreground hover:text-primary"
            >
              {t.nav.home}
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left py-2 text-foreground hover:text-primary"
            >
              {t.nav.about}
            </button>
            <button
              onClick={() => scrollToSection("products")}
              className="block w-full text-left py-2 text-foreground hover:text-primary"
            >
              {t.nav.products}
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="block w-full text-left py-2 text-foreground hover:text-primary"
            >
              {t.nav.contact}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-20 min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-5xl md:text-7xl font-bold text-primary mb-4">{t.hero.title}</h1>
              <h2 className="text-xl md:text-2xl text-muted-foreground mb-6">{t.hero.subtitle}</h2>
              <p className="text-lg leading-relaxed mb-8 text-balance">{t.hero.description}</p>
              <Button
                onClick={() => scrollToSection("products")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
              >
                {t.hero.cta}
              </Button>
            </div>
            <div className="animate-fade-in-up">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5-fPZTZ7f3O9hLpKiQCKIVCUxgHuGbpI.png"
                alt="LUVRA Premium Liquid Soap"
                className="w-full max-w-md mx-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.about.title}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.about.features.hygienic}</h3>
            </div>
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.about.features.moisturizing}</h3>
            </div>
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.about.features.economical}</h3>
            </div>
            <div className="text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.about.features.unique}</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.products.title}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-balance">{t.products.description}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
            <div>
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5-Sn3COH5vSNdL3xaKAN88Q8LxEFDcNe.png"
                alt="LUVRA Product Range"
                className="w-full rounded-lg shadow-2xl"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-4">{t.products.available}</h3>
              <p className="text-lg mb-6">{t.products.sizes}</p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>490 ml - {language === "ru" ? "Компактный размер" : "Ixcham o'lcham"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>900 ml - {language === "ru" ? "Семейный размер" : "Oilaviy o'lcham"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.contact.title}</h2>
          </div>
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-semibold mb-6">{t.contact.phones}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <Phone className="text-primary" size={20} />
                <a href="tel:+998970107707" className="text-lg hover:text-primary transition-colors">
                  +998 97 010 77 07
                </a>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <Phone className="text-primary" size={20} />
                <a href="tel:+998770807707" className="text-lg hover:text-primary transition-colors">
                  +998 77 080 77 07
                </a>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-6 mt-8">{t.contact.email}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <a href="mailto:info@luvra.com" className="text-lg hover:text-primary transition-colors">
                  info@luvra.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-6">LUVRA</div>
            <p className="text-lg mb-8">{t.footer.followUs}</p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                <Instagram size={24} />
              </a>
              <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                <Facebook size={24} />
              </a>
              <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                <Twitter size={24} />
              </a>
            </div>
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                © 2024 LUVRA. {language === "ru" ? "Все права защищены." : "Barcha huquqlar himoyalangan."}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
