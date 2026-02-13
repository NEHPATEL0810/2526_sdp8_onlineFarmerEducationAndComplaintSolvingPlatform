import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TranslateText from "./TranslateText";

const blogs = [
    {
        image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=600&auto=format&fit=crop",
        tag: "Crop Education",
        title: "How to Increase Wheat Yield Using Smart Techniques",
        description:
            "Learn practical, AI-backed strategies for soil preparation, seed selection, and pest control to boost your wheat production this season.",
    },
    {
        image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=600&auto=format&fit=crop",
        tag: "Government Schemes",
        title: "Understanding PM-KISAN and Other Farmer Schemes",
        description:
            "A simple guide to eligibility, benefits, and application processes for major government schemes designed to support Indian farmers.",
    },
    {
        image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=600&auto=format&fit=crop",
        tag: "Irrigation",
        title: "Best Irrigation Practices for Water Conservation",
        description:
            "Discover drip irrigation, sprinkler systems, and smart scheduling techniques that save water while keeping your crops healthy and productive.",
    },
];

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
    }),
};

export default function BlogSection() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section
            ref={ref}
            className="w-full py-20 md:py-28 px-4"
            style={{ background: "#ffffc5" }}
        >
            <div className="max-w-[1200px] mx-auto">
                {/* Heading */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                        <TranslateText>Latest Insights &</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>Tips</TranslateText>
                        </span>
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto text-base">
                        <TranslateText>Practical farming knowledge, scheme updates, and crop tips — written in simple language for everyday farmers.</TranslateText>
                    </p>
                </motion.div>

                {/* Blog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {blogs.map((blog, i) => (
                        <motion.div
                            key={blog.title}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            whileHover={{ y: -6 }}
                            className="rounded-2xl overflow-hidden cursor-pointer group"
                            style={{
                                background: "#fff",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                            }}
                        >
                            {/* Image */}
                            <div className="h-[200px] overflow-hidden">
                                <img
                                    src={blog.image}
                                    alt={blog.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <span
                                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
                                    style={{ background: "#f0fdf4", color: "#15803d" }}
                                >
                                    <TranslateText>{blog.tag}</TranslateText>
                                </span>
                                <h3 className="text-base font-bold text-gray-800 mb-2 leading-snug">
                                    <TranslateText>{blog.title}</TranslateText>
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    <TranslateText>{blog.description}</TranslateText>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
