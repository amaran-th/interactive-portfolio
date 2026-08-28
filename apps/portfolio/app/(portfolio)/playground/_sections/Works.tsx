"use client";

import { useState } from "react";
import Work, { WorkItem } from "./Works/Work";
import WorkModal from "./Works/WorkModal";
import { works } from "./Works/data";

export default function Works() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (item: WorkItem) => {
    const index = works.findIndex((w) => w.id === item.id);
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
    setSelectedIndex(Math.max(0, Math.min(works.length - 1, index)));
  };

  return (
    <section>
      <h2 className="text-xl font-semibold mb-8 text-white/80">Works</h2>
      <Work items={works} onItemClick={openModal} />
      {selectedIndex !== null && (
        <WorkModal
          works={works}
          selectedIndex={selectedIndex}
          onNavigate={navigate}
          isOpen={modalOpen}
          onClose={closeModal}
        />
      )}
    </section>
  );
}
