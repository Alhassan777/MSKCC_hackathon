import { NextRequest, NextResponse } from 'next/server';
import { ChatRequest, ChatResponse, BotMessage, IntentKey, SupportedLocale } from '@/types/chat';

// Mock data for different intents and locales
const mockResponses: Record<SupportedLocale, Record<IntentKey, BotMessage[]>> = {
  en: {
    screening: [
      {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: 'Cancer screening and early detection are crucial for young adults. MSK offers comprehensive screening programs tailored to your age and risk factors.',
        citations: [
          { title: 'Young Adult Cancer Screening Guide', url: 'https://mskcc.org/aya-screening' }
        ],
        actions: [
          { type: 'schedule', label: 'Schedule Screening', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'Call Us', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    scheduling: [
      {
        id: `msg_${Date.now()}_2`,
        role: 'assistant',
        content: 'You can schedule appointments online 24/7 or call our dedicated AYA scheduling line. We offer flexible scheduling to accommodate work and school.',
        citations: [
          { title: 'Online Appointment Scheduling', url: 'https://mskcc.org/appointments' }
        ],
        actions: [
          { type: 'schedule', label: 'Schedule Online', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'Call Scheduling', href: 'tel:+1-212-639-7606' }
        ],
        timestamp: new Date(),
      }
    ],
    costs: [
      {
        id: `msg_${Date.now()}_3`,
        role: 'assistant',
        content: 'We understand cost concerns for young adults. MSK offers financial counseling, payment plans, and assistance programs. Insurance coverage varies by plan.',
        citations: [
          { title: 'Financial Assistance Programs', url: 'https://mskcc.org/insurance-assistance' }
        ],
        actions: [
          { type: 'resource', label: 'Financial Resources', href: 'https://mskcc.org/insurance-assistance' },
          { type: 'call', label: 'Financial Counseling', href: 'tel:+1-212-639-3910' }
        ],
        timestamp: new Date(),
      }
    ],
    aya: [
      {
        id: `msg_${Date.now()}_4`,
        role: 'assistant',
        content: 'Our AYA Program provides specialized support for ages 18-39, including peer support groups, fertility counseling, and career/education guidance.',
        citations: [
          { title: 'AYA Program Overview', url: 'https://mskcc.org/aya-program' }
        ],
        actions: [
          { type: 'resource', label: 'AYA Resources', href: 'https://mskcc.org/aya-program' },
          { type: 'schedule', label: 'Meet AYA Team', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ],
    wayfinding: [
      {
        id: `msg_${Date.now()}_5`,
        role: 'assistant',
        content: 'MSK has multiple locations in NYC and beyond. Our main campus is at 1275 York Avenue. We provide detailed directions and parking information.',
        citations: [
          { title: 'MSK Locations & Directions', url: 'https://mskcc.org/locations' }
        ],
        actions: [
          { type: 'resource', label: 'View Locations', href: 'https://mskcc.org/locations' },
          { type: 'call', label: 'Main Number', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    glossary: [
      {
        id: `msg_${Date.now()}_6`,
        role: 'assistant',
        content: 'Medical terms can be confusing. Our online glossary explains cancer terminology in plain language, designed specifically for young adults.',
        citations: [
          { title: 'Cancer Glossary for Young Adults', url: 'https://mskcc.org/glossary' }
        ],
        actions: [
          { type: 'resource', label: 'Browse Glossary', href: 'https://mskcc.org/glossary' },
          { type: 'call', label: 'Ask a Nurse', href: 'tel:+1-212-639-7056' }
        ],
        timestamp: new Date(),
      }
    ],
    language_selection: [],
    unknown: [
      {
        id: `msg_${Date.now()}_7`,
        role: 'assistant',
        content: 'I can help with information about MSK services, scheduling, costs, and young adult resources. For specific medical questions, please speak with your care team.',
        actions: [
          { type: 'call', label: 'Call MSK', href: 'tel:+1-212-639-2000' },
          { type: 'schedule', label: 'Schedule Appointment', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ]
  },
  es: {
    screening: [
      {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: 'La detección temprana del cáncer es crucial para adultos jóvenes. MSK ofrece programas de detección integrales adaptados a su edad y factores de riesgo.',
        citations: [
          { title: 'Guía de Detección de Cáncer para Adultos Jóvenes', url: 'https://mskcc.org/aya-screening' }
        ],
        actions: [
          { type: 'schedule', label: 'Programar Detección', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'Llamarnos', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    scheduling: [
      {
        id: `msg_${Date.now()}_2`,
        role: 'assistant',
        content: 'Puede programar citas en línea 24/7 o llamar a nuestra línea de programación AYA dedicada. Ofrecemos horarios flexibles para acomodar el trabajo y la escuela.',
        citations: [
          { title: 'Programación de Citas en Línea', url: 'https://mskcc.org/appointments' }
        ],
        actions: [
          { type: 'schedule', label: 'Programar en Línea', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'Llamar Programación', href: 'tel:+1-212-639-7606' }
        ],
        timestamp: new Date(),
      }
    ],
    costs: [
      {
        id: `msg_${Date.now()}_3`,
        role: 'assistant',
        content: 'Entendemos las preocupaciones de costos para adultos jóvenes. MSK ofrece asesoramiento financiero, planes de pago y programas de asistencia.',
        citations: [
          { title: 'Programas de Asistencia Financiera', url: 'https://mskcc.org/insurance-assistance' }
        ],
        actions: [
          { type: 'resource', label: 'Recursos Financieros', href: 'https://mskcc.org/insurance-assistance' },
          { type: 'call', label: 'Asesoramiento Financiero', href: 'tel:+1-212-639-3910' }
        ],
        timestamp: new Date(),
      }
    ],
    aya: [
      {
        id: `msg_${Date.now()}_4`,
        role: 'assistant',
        content: 'Nuestro Programa AYA brinda apoyo especializado para edades 18-39, incluyendo grupos de apoyo, asesoramiento de fertilidad y orientación profesional/educativa.',
        citations: [
          { title: 'Resumen del Programa AYA', url: 'https://mskcc.org/aya-program' }
        ],
        actions: [
          { type: 'resource', label: 'Recursos AYA', href: 'https://mskcc.org/aya-program' },
          { type: 'schedule', label: 'Conocer Equipo AYA', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ],
    wayfinding: [
      {
        id: `msg_${Date.now()}_5`,
        role: 'assistant',
        content: 'MSK tiene múltiples ubicaciones en NYC y más allá. Nuestro campus principal está en 1275 York Avenue. Proporcionamos direcciones detalladas e información de estacionamiento.',
        citations: [
          { title: 'Ubicaciones y Direcciones de MSK', url: 'https://mskcc.org/locations' }
        ],
        actions: [
          { type: 'resource', label: 'Ver Ubicaciones', href: 'https://mskcc.org/locations' },
          { type: 'call', label: 'Número Principal', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    glossary: [
      {
        id: `msg_${Date.now()}_6`,
        role: 'assistant',
        content: 'Los términos médicos pueden ser confusos. Nuestro glosario en línea explica la terminología del cáncer en lenguaje sencillo, diseñado específicamente para adultos jóvenes.',
        citations: [
          { title: 'Glosario de Cáncer para Adultos Jóvenes', url: 'https://mskcc.org/glossary' }
        ],
        actions: [
          { type: 'resource', label: 'Explorar Glosario', href: 'https://mskcc.org/glossary' },
          { type: 'call', label: 'Preguntar a Enfermera', href: 'tel:+1-212-639-7056' }
        ],
        timestamp: new Date(),
      }
    ],
    language_selection: [],
    unknown: [
      {
        id: `msg_${Date.now()}_7`,
        role: 'assistant',
        content: 'Puedo ayudar con información sobre servicios de MSK, programación, costos y recursos para adultos jóvenes. Para preguntas médicas específicas, hable con su equipo de atención.',
        actions: [
          { type: 'call', label: 'Llamar a MSK', href: 'tel:+1-212-639-2000' },
          { type: 'schedule', label: 'Programar Cita', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ]
  },
  ar: {
    screening: [
      {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: 'الكشف المبكر عن السرطان أمر بالغ الأهمية للبالغين الشباب. يقدم MSK برامج فحص شاملة مصممة خصيصاً لعمرك وعوامل الخطر لديك.',
        citations: [
          { title: 'دليل فحص السرطان للبالغين الشباب', url: 'https://mskcc.org/aya-screening' }
        ],
        actions: [
          { type: 'schedule', label: 'حجز موعد فحص', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'اتصل بنا', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    scheduling: [
      {
        id: `msg_${Date.now()}_2`,
        role: 'assistant',
        content: 'يمكنك حجز المواعيد عبر الإنترنت على مدار الساعة طوال أيام الأسبوع أو الاتصال بخط حجز AYA المخصص. نقدم جدولة مرنة لاستيعاب العمل والدراسة.',
        citations: [
          { title: 'حجز المواعيد عبر الإنترنت', url: 'https://mskcc.org/appointments' }
        ],
        actions: [
          { type: 'schedule', label: 'حجز عبر الإنترنت', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'اتصل للحجز', href: 'tel:+1-212-639-7606' }
        ],
        timestamp: new Date(),
      }
    ],
    costs: [
      {
        id: `msg_${Date.now()}_3`,
        role: 'assistant',
        content: 'نتفهم مخاوف التكلفة للبالغين الشباب. يقدم MSK الاستشارة المالية وخطط الدفع وبرامج المساعدة.',
        citations: [
          { title: 'برامج المساعدة المالية', url: 'https://mskcc.org/insurance-assistance' }
        ],
        actions: [
          { type: 'resource', label: 'الموارد المالية', href: 'https://mskcc.org/insurance-assistance' },
          { type: 'call', label: 'الاستشارة المالية', href: 'tel:+1-212-639-3910' }
        ],
        timestamp: new Date(),
      }
    ],
    aya: [
      {
        id: `msg_${Date.now()}_4`,
        role: 'assistant',
        content: 'يوفر برنامج AYA دعماً متخصصاً للأعمار 18-39، بما في ذلك مجموعات الدعم والاستشارة حول الخصوبة والتوجيه المهني/التعليمي.',
        citations: [
          { title: 'نظرة عامة على برنامج AYA', url: 'https://mskcc.org/aya-program' }
        ],
        actions: [
          { type: 'resource', label: 'موارد AYA', href: 'https://mskcc.org/aya-program' },
          { type: 'schedule', label: 'مقابلة فريق AYA', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ],
    wayfinding: [
      {
        id: `msg_${Date.now()}_5`,
        role: 'assistant',
        content: 'يوجد لدى MSK مواقع متعددة في نيويورك وخارجها. يقع حرمنا الرئيسي في 1275 York Avenue. نقدم توجيهات مفصلة ومعلومات عن مواقف السيارات.',
        citations: [
          { title: 'مواقع واتجاهات MSK', url: 'https://mskcc.org/locations' }
        ],
        actions: [
          { type: 'resource', label: 'عرض المواقع', href: 'https://mskcc.org/locations' },
          { type: 'call', label: 'الرقم الرئيسي', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    glossary: [
      {
        id: `msg_${Date.now()}_6`,
        role: 'assistant',
        content: 'قد تكون المصطلحات الطبية مربكة. يشرح مسردنا عبر الإنترنت مصطلحات السرطان بلغة بسيطة، مصمم خصيصاً للبالغين الشباب.',
        citations: [
          { title: 'مسرد السرطان للبالغين الشباب', url: 'https://mskcc.org/glossary' }
        ],
        actions: [
          { type: 'resource', label: 'تصفح المسرد', href: 'https://mskcc.org/glossary' },
          { type: 'call', label: 'اسأل ممرضة', href: 'tel:+1-212-639-7056' }
        ],
        timestamp: new Date(),
      }
    ],
    language_selection: [],
    unknown: [
      {
        id: `msg_${Date.now()}_7`,
        role: 'assistant',
        content: 'يمكنني المساعدة بمعلومات حول خدمات MSK والجدولة والتكاليف وموارد البالغين الشباب. للأسئلة الطبية المحددة، يرجى التحدث مع فريق الرعاية الخاص بك.',
        actions: [
          { type: 'call', label: 'اتصل بـ MSK', href: 'tel:+1-212-639-2000' },
          { type: 'schedule', label: 'حجز موعد', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ]
  },
  zh: {
    screening: [
      {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: '癌症筛查和早期发现对年轻成人至关重要。MSK提供针对您的年龄和风险因素定制的综合筛查项目。',
        citations: [
          { title: '年轻成人癌症筛查指南', url: 'https://mskcc.org/aya-screening' }
        ],
        actions: [
          { type: 'schedule', label: '预约筛查', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: '致电我们', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    scheduling: [
      {
        id: `msg_${Date.now()}_2`,
        role: 'assistant',
        content: '您可以24/7在线预约或致电我们专门的AYA预约热线。我们提供灵活的时间安排以适应工作和学习。',
        citations: [
          { title: '在线预约', url: 'https://mskcc.org/appointments' }
        ],
        actions: [
          { type: 'schedule', label: '在线预约', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: '致电预约', href: 'tel:+1-212-639-7606' }
        ],
        timestamp: new Date(),
      }
    ],
    costs: [
      {
        id: `msg_${Date.now()}_3`,
        role: 'assistant',
        content: '我们理解年轻成人对费用的担忧。MSK提供财务咨询、付款计划和援助项目。',
        citations: [
          { title: '财务援助项目', url: 'https://mskcc.org/insurance-assistance' }
        ],
        actions: [
          { type: 'resource', label: '财务资源', href: 'https://mskcc.org/insurance-assistance' },
          { type: 'call', label: '财务咨询', href: 'tel:+1-212-639-3910' }
        ],
        timestamp: new Date(),
      }
    ],
    aya: [
      {
        id: `msg_${Date.now()}_4`,
        role: 'assistant',
        content: '我们的AYA项目为18-39岁人群提供专门支持，包括同伴支持小组、生育咨询和职业/教育指导。',
        citations: [
          { title: 'AYA项目概述', url: 'https://mskcc.org/aya-program' }
        ],
        actions: [
          { type: 'resource', label: 'AYA资源', href: 'https://mskcc.org/aya-program' },
          { type: 'schedule', label: '会见AYA团队', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ],
    wayfinding: [
      {
        id: `msg_${Date.now()}_5`,
        role: 'assistant',
        content: 'MSK在纽约市及其他地区有多个地点。我们的主校区位于1275 York Avenue。我们提供详细的路线和停车信息。',
        citations: [
          { title: 'MSK地点和路线', url: 'https://mskcc.org/locations' }
        ],
        actions: [
          { type: 'resource', label: '查看地点', href: 'https://mskcc.org/locations' },
          { type: 'call', label: '主要电话', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    glossary: [
      {
        id: `msg_${Date.now()}_6`,
        role: 'assistant',
        content: '医学术语可能令人困惑。我们的在线词汇表用通俗易懂的语言解释癌症术语，专为年轻成人设计。',
        citations: [
          { title: '年轻成人癌症词汇表', url: 'https://mskcc.org/glossary' }
        ],
        actions: [
          { type: 'resource', label: '浏览词汇表', href: 'https://mskcc.org/glossary' },
          { type: 'call', label: '咨询护士', href: 'tel:+1-212-639-7056' }
        ],
        timestamp: new Date(),
      }
    ],
    language_selection: [],
    unknown: [
      {
        id: `msg_${Date.now()}_7`,
        role: 'assistant',
        content: '我可以帮助您了解MSK服务、预约、费用和年轻成人资源信息。对于具体的医疗问题，请与您的医疗团队交谈。',
        actions: [
          { type: 'call', label: '致电MSK', href: 'tel:+1-212-639-2000' },
          { type: 'schedule', label: '预约', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ]
  },
  pt: {
    screening: [
      {
        id: `msg_${Date.now()}_1`,
        role: 'assistant',
        content: 'O rastreamento e detecção precoce do câncer são cruciais para jovens adultos. O MSK oferece programas de rastreamento abrangentes adaptados à sua idade e fatores de risco.',
        citations: [
          { title: 'Guia de Rastreamento de Câncer para Jovens Adultos', url: 'https://mskcc.org/aya-screening' }
        ],
        actions: [
          { type: 'schedule', label: 'Agendar Rastreamento', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'Ligar para Nós', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    scheduling: [
      {
        id: `msg_${Date.now()}_2`,
        role: 'assistant',
        content: 'Você pode agendar consultas online 24/7 ou ligar para nossa linha de agendamento AYA dedicada. Oferecemos horários flexíveis para acomodar trabalho e estudos.',
        citations: [
          { title: 'Agendamento Online de Consultas', url: 'https://mskcc.org/appointments' }
        ],
        actions: [
          { type: 'schedule', label: 'Agendar Online', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' },
          { type: 'call', label: 'Ligar para Agendamento', href: 'tel:+1-212-639-7606' }
        ],
        timestamp: new Date(),
      }
    ],
    costs: [
      {
        id: `msg_${Date.now()}_3`,
        role: 'assistant',
        content: 'Entendemos as preocupações com custos para jovens adultos. O MSK oferece aconselhamento financeiro, planos de pagamento e programas de assistência.',
        citations: [
          { title: 'Programas de Assistência Financeira', url: 'https://mskcc.org/insurance-assistance' }
        ],
        actions: [
          { type: 'resource', label: 'Recursos Financeiros', href: 'https://mskcc.org/insurance-assistance' },
          { type: 'call', label: 'Aconselhamento Financeiro', href: 'tel:+1-212-639-3910' }
        ],
        timestamp: new Date(),
      }
    ],
    aya: [
      {
        id: `msg_${Date.now()}_4`,
        role: 'assistant',
        content: 'Nosso Programa AYA fornece apoio especializado para idades 18-39, incluindo grupos de apoio entre pares, aconselhamento sobre fertilidade e orientação profissional/educacional.',
        citations: [
          { title: 'Visão Geral do Programa AYA', url: 'https://mskcc.org/aya-program' }
        ],
        actions: [
          { type: 'resource', label: 'Recursos AYA', href: 'https://mskcc.org/aya-program' },
          { type: 'schedule', label: 'Conhecer Equipe AYA', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ],
    wayfinding: [
      {
        id: `msg_${Date.now()}_5`,
        role: 'assistant',
        content: 'O MSK tem múltiplas localizações em NYC e além. Nosso campus principal fica em 1275 York Avenue. Fornecemos direções detalhadas e informações de estacionamento.',
        citations: [
          { title: 'Localizações e Direções do MSK', url: 'https://mskcc.org/locations' }
        ],
        actions: [
          { type: 'resource', label: 'Ver Localizações', href: 'https://mskcc.org/locations' },
          { type: 'call', label: 'Número Principal', href: 'tel:+1-212-639-2000' }
        ],
        timestamp: new Date(),
      }
    ],
    glossary: [
      {
        id: `msg_${Date.now()}_6`,
        role: 'assistant',
        content: 'Termos médicos podem ser confusos. Nosso glossário online explica terminologia de câncer em linguagem simples, projetado especificamente para jovens adultos.',
        citations: [
          { title: 'Glossário de Câncer para Jovens Adultos', url: 'https://mskcc.org/glossary' }
        ],
        actions: [
          { type: 'resource', label: 'Navegar Glossário', href: 'https://mskcc.org/glossary' },
          { type: 'call', label: 'Perguntar a uma Enfermeira', href: 'tel:+1-212-639-7056' }
        ],
        timestamp: new Date(),
      }
    ],
    language_selection: [],
    unknown: [
      {
        id: `msg_${Date.now()}_7`,
        role: 'assistant',
        content: 'Posso ajudar com informações sobre serviços do MSK, agendamento, custos e recursos para jovens adultos. Para questões médicas específicas, fale com sua equipe de cuidados.',
        actions: [
          { type: 'call', label: 'Ligar para MSK', href: 'tel:+1-212-639-2000' },
          { type: 'schedule', label: 'Agendar Consulta', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
        ],
        timestamp: new Date(),
      }
    ]
  }
};

function determineIntent(text: string): IntentKey {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('screen') || lowerText.includes('test') || lowerText.includes('check')) {
    return 'screening';
  }
  if (lowerText.includes('appointment') || lowerText.includes('schedule') || lowerText.includes('book')) {
    return 'scheduling';
  }
  if (lowerText.includes('cost') || lowerText.includes('insurance') || lowerText.includes('pay') || lowerText.includes('bill')) {
    return 'costs';
  }
  if (lowerText.includes('young adult') || lowerText.includes('aya') || lowerText.includes('support')) {
    return 'aya';
  }
  if (lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('direction') || lowerText.includes('where')) {
    return 'wayfinding';
  }
  if (lowerText.includes('term') || lowerText.includes('meaning') || lowerText.includes('definition') || lowerText.includes('what is')) {
    return 'glossary';
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { sessionId, text, intent, meta } = body;
    
    // Get locale from headers or request body
    const locale = (request.headers.get('X-Locale') || meta?.locale || 'en') as SupportedLocale;
    
    // Validate locale
    const validLocales: SupportedLocale[] = ['en', 'es', 'ar', 'zh', 'pt'];
    const finalLocale = validLocales.includes(locale) ? locale : 'en';
    
    // Determine intent
    let finalIntent: IntentKey;
    if (intent) {
      finalIntent = intent;
    } else if (text) {
      finalIntent = determineIntent(text);
    } else {
      finalIntent = 'unknown';
    }
    
    // Get mock response
    const responses = mockResponses[finalLocale]?.[finalIntent] || mockResponses[finalLocale].unknown;
    
    // Add some artificial delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const elapsedMs = Date.now() - startTime;
    
    const response: ChatResponse = {
      messages: responses,
      intent: finalIntent,
      elapsedMs,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return error response with action buttons
    const errorResponse: ChatResponse = {
      messages: [
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again or contact us directly for assistance.',
          actions: [
            { type: 'call', label: 'Call MSK', href: 'tel:+1-212-639-2000' },
            { type: 'schedule', label: 'Schedule Online', href: process.env.NEXT_PUBLIC_BOOKING_URL || 'https://mskcc.org/appointments' }
          ],
          timestamp: new Date(),
        }
      ],
      intent: 'unknown',
      elapsedMs: Date.now() - startTime,
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
