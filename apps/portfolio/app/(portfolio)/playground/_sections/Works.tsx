"use client";

import { useState } from "react";
import Work, { WorkItem } from "./Works/Work";
import WorkModal from "./Works/WorkModal";
import { works } from "./Works/data";

const visibleWorks = works.filter((work) => work.title !== "별들은 굉장한 빛메이커이다");

export default function Works() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (item: WorkItem) => {
    const index = visibleWorks.findIndex((w) => w.id === item.id);
    setSelectedIndex(index);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setModalOpen(true)),
    );
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedIndex(null), 300);
  };

  const navigate = (index: number) => {
    setSelectedIndex(Math.max(0, Math.min(visibleWorks.length - 1, index)));
  };

  return (
    <section>
      <h2 className="text-xl font-semibold mb-8 text-white/80">Works</h2>
      <Work items={visibleWorks} onItemClick={openModal} />
      {selectedIndex !== null && (
        <WorkModal
          works={visibleWorks}
          selectedIndex={selectedIndex}
          onNavigate={navigate}
          isOpen={modalOpen}
          onClose={closeModal}
        />
      )}
    </section>
  );
}
