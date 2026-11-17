// Narration script. `speak` is sent to TTS; `show` is displayed ([...] = emphasis, \n = line break).
// `section` picks the illustration; lines sharing a `group` stay stacked on screen together.
// `gap` is silence (s) after the line.
export const LINES = [
  // 0 — opening question
  { section: 'question', speak: '患有抑郁焦虑症的学生，恐惧学校，但是又渴望学习。该怎么迈出第一步？', show: '患有抑郁焦虑症的学生恐惧学校，\n但是又渴望学习——\n该怎么迈出[第 1 步]？', gap: 1.2 },

  // 1 — compare with yourself
  { section: 'self', speak: '不要跟别人比，和你自己比。', show: '不要跟别人比，[和你自己比]。', gap: 1.0 },

  // 2-4 — three small acts of courage
  { section: 'brave', group: 'brave', speak: '你原来都不敢去学校的，现在敢去了。走到学校大门，你就是战胜自己的英雄。', show: '原来不敢去学校，现在敢去了——走到学校大门，你就是[战胜自己的英雄]。', gap: 0.6 },
  { section: 'brave', group: 'brave', speak: '你原来都不敢坐进教室的，现在你可以坐半天才请假。你真的很勇敢。', show: '原来不敢坐进教室，现在可以坐半天才请假——你[真的很勇敢]。', gap: 0.6 },
  { section: 'brave', group: 'brave', speak: '你原来都不敢抬头看老师的，现在你跟老师打了个招呼。你值得为自己鼓掌！', show: '原来不敢抬头看老师，现在跟老师打了个招呼——你[值得为自己鼓掌]！', gap: 1.1 },

  // 5 — start point
  { section: 'start', speak: '别怕起点低，因为起点根本不重要。', show: '别怕起点低，\n因为起点[根本不重要]。', gap: 0.9 },

  // 6-9 — walking rhythm
  { section: 'walk', speak: '往前走。把左脚放到右脚前面，再把右脚放到左脚前面。', show: '往前走，\n把[左脚]放到右脚前面，再把[右脚]放到左脚前面。', gap: 0.6 },
  { section: 'walk', group: 'beat', speak: '左右，右左。', show: '左右，右左。', gap: 0.5 },
  { section: 'walk', group: 'beat', speak: '一二一。', show: '一 二 一。', gap: 0.4 },
  { section: 'walk', group: 'beat', speak: '一二一。', show: '一 二 一。', gap: 1.0 },

  // 10-12 — a little more each day
  { section: 'stairs', speak: '每天多战胜自己多一点点。', show: '每天多战胜自己[多一点点]。', gap: 0.5 },
  { section: 'stairs', speak: '一点点就可以。', show: '[一点点]就可以。', gap: 0.8 },
  { section: 'stairs', speak: '一时战胜不了，也不要怕。歇一歇，继续向上努力。', show: '一时战胜不了，也不要怕，\n[歇一歇]，继续[向上]努力。', gap: 1.1 },

  // 13-23 — 1.01 compounding
  { section: 'graph', speak: '我告诉你一个小秘密：人战胜自己的步调，不是线性的。', show: '告诉你一个小秘密——\n人战胜自己的步调[不是线性的]。', gap: 0.6 },
  { section: 'graph', group: 'formula', speak: '不是一加一加一加一这样，', show: '不是 1 + 1 + 1 + 1 这样，', gap: 0.3 },
  { section: 'graph', group: 'formula', speak: '而是，一点零一，乘一点零一，乘一点零一……这样。', show: '而是 [1.01 × 1.01 × 1.01……] 这样。', gap: 1.0 },
  { section: 'graph', speak: '一旦你习惯了战胜自己，学会了为自己鼓掌，学会了为一点零一欢呼，尤其是对这上了瘾，', show: '一旦你习惯了战胜自己，学会了为自己鼓掌，\n学会了为 [1.01] 欢呼，尤其是对这上了瘾——', gap: 0.5 },
  { section: 'graph', speak: '那么哪怕你只剩下十年的寿命，你最终的高度，也是不可限量的。', show: '那么哪怕你只剩下十年的寿命，\n你最终的高度也是[不可限量]的。', gap: 0.6 },
  { section: 'graph', speak: '不可限量，你懂吗？', show: '[不可限量]，你懂吗？', gap: 1.0 },
  { section: 'late', speak: '一个一点零一乘一点零一的人，即使从十二岁才开始识字，都有机会成名成家。', show: '一个 [1.01 × 1.01] 的人，\n即使从 12 岁才开始识字，都有机会[成名成家]。', gap: 0.6 },
  { section: 'late', speak: '你前面还有不知多少个十年。小学、初中、高中，哪怕大学那点知识，对你并不是不可克服的困难。', show: '你前面还有[不知多少个十年]，\n小学、初中、高中，哪怕大学那点知识，\n对你并不是不可克服的困难。', gap: 0.6 },
  { section: 'late', speak: '你只是要停止觉得，一点零一乘一点零一，毫无变化。', show: '你只是要停止觉得\n“1.01 × 1.01 [毫无变化]”。', gap: 1.0 },
  { section: 'weeks', speak: '你知道吗？哪怕是一个星期增长一点零一，十年，是一百七十六倍。', show: '你知道吗？哪怕是一个星期增长 1.01，\n十年是 [176 倍]。', gap: 0.5 },
  { section: 'weeks', speak: '一百七十六倍。', show: '[176 倍]。', gap: 1.4 },

  // 24-25 — your advantage
  { section: 'advantage', speak: '你不是没有优势的。你已经知道，退缩和逃避没有意义。', show: '你不是没有优势的——\n你已经知道“[退缩和逃避没有意义]”。', gap: 0.6 },
  { section: 'advantage', speak: '别人比你多了课堂知识，但少了这份，退缩和逃避解决不了问题的觉悟。', show: '别人比你多了课堂知识，\n但少了这份“退缩和逃避解决不了问题”的[觉悟]。', gap: 1.0 },

  // 26-28 — out of the dark
  { section: 'dark', speak: '而且你还有一份最大的优势：那就是你自己从地狱里走了出来，你就知道离开幽暗的路了。', show: '而且你还有一份最大的优势——\n你自己从地狱里走了出来，\n你就[知道离开幽暗的路]了。', gap: 0.7 },
  { section: 'dark', speak: '你将来很有希望，做一名接引别人离开幽暗的使者。还有什么资历，比亲自从黑暗中走出来，更有说服力、更有价值呢？', show: '你将来很有希望做一名[接引别人离开幽暗的使者]——\n还有什么资历比亲自从黑暗中走出来\n更有说服力、更有价值呢？', gap: 0.7 },
  { section: 'dark', speak: '前提是，你自己要走出来。', show: '前提是[你自己要走出来]。', gap: 1.0 },

  // 29-30 — walking rhythm again
  { section: 'walk', group: 'beat2', speak: '一二一，一二一。', show: '一 二 一，一 二 一。', gap: 0.5 },
  { section: 'walk', group: 'beat2', speak: '左脚放到右脚前面，再把右脚放到左脚前面。', show: '[左脚]放到右脚前面，再把[右脚]放到左脚前面。', gap: 1.0 },

  // 31-32 — canyon to plain
  { section: 'canyon', speak: '别管别人从地面开始，走到了多高的山上。你从峡谷里走到平原的这一段路，是有价值的。', show: '别管别人从地面开始走到了多高的山上，\n你[从峡谷里走到平原]的这一段路是有价值的。', gap: 0.6 },
  { section: 'canyon', speak: '而且，对不知多少与你一样的后人，有生死攸关的价值。', show: '而且对不知多少与你一样的后人\n有[生死攸关的价值]。', gap: 1.1 },

  // 33-36 — knowledge no teacher can give
  { section: 'lesson', speak: '这份努力的体验本身带给你的知识，是数学老师、化学老师教不了的。', show: '这份努力的体验本身带给你的知识，\n是数学老师、化学老师[教不了]的。', gap: 0.5 },
  { section: 'lesson', speak: '也是那些一帆风顺、拿了辉煌的心理学位的高材生们，所无缘体验的。', show: '也是那些一帆风顺、拿了辉煌心理学位的高材生们\n所[无缘体验]的。', gap: 0.6 },
  { section: 'lesson', speak: '这就像军事学院的优秀毕业生，和战场上幸存的士兵，对战斗的理解，不能互相取代一样。', show: '就像军事学院的优秀毕业生和[战场上幸存的士兵]，\n对战斗的理解不能互相取代。', gap: 0.6 },
  { section: 'lesson', speak: '这不是说他们毫无价值，但你所拥有的，也绝对不是毫无价值。', show: '这不是说 ta 们毫无价值，\n但你所拥有的也[绝对不是毫无价值]。', gap: 1.0 },

  // 37-38 — learning under pressure
  { section: 'redox', speak: '你学会氧化还原反应，和他们学会氧化还原反应的价值是不同的，因为你是顶着额外的重压学会的。', show: '你学会氧化还原反应和 ta 们学会的价值是不同的，\n因为你是[顶着额外的重压]学会的。', gap: 0.6 },
  { section: 'redox', speak: '你除了学会了氧化还原反应，还学会了如何顶住重压。', show: '你除了学会了氧化还原反应，\n还学会了[如何顶住重压]。', gap: 1.1 },

  // 39-41 — the school gate, again
  { section: 'gate', speak: '这也是为什么我说，你只要走进学校大门，就是英雄。', show: '这也是为什么我说，\n你只要走进学校大门就是[英雄]——', gap: 0.4 },
  { section: 'gate', speak: '没有体验过的人不明白，这看上去是一件小事，却可能比一个普通人人生做过的最难的一件事，还要艰难。', show: '没有体验过的人不明白，这看上去是一件小事，\n却可能比一个普通人人生做过的[最难的一件事]还要艰难。', gap: 0.7 },
  { section: 'gate', speak: '那压在心上的山有多重，我明白的。你相信吗？', show: '那压在心上的山有多重，\n[我明白的]，你相信吗？', gap: 1.1 },

  // 42-44 — carrying the mountain
  { section: 'mountain', speak: '所以，绝不要轻看了自己挣扎着做成的那些，似乎对其他人轻而易举的事。不要觉得这是，落后了别人好多。', show: '所以绝不要轻看了自己挣扎着做成的、\n那些似乎对其他人[轻而易举]的事，\n不要觉得这是“落后了别人好多”。', gap: 0.7 },
  { section: 'mountain', speak: '扛着整座山走路的人，不需要跟人比速度，比的是扛住整座山。', show: '扛着整座山走路的人，不需要跟人比速度，\n比的是[扛住整座山]。', gap: 0.7 },
  { section: 'mountain', speak: '自有其他扛着整座山的人，需要你的帮助和示范。', show: '自有其他扛着整座山的人\n需要你的[帮助和示范]。', gap: 1.1 },

  // 45-48 — heart first
  { section: 'heart', speak: '落后的，只是学校知识罢了，不是心。', show: '落后的只是学校知识罢了，\n[不是心]。', gap: 0.7 },
  { section: 'heart', speak: '天注定你要先修心，再修知识。', show: '天注定你要[先修心]，再修知识。', gap: 0.7 },
  { section: 'heart', speak: '你迈出这一步，就在心上，超过没有经历过的人们了。', show: '你迈出这一步，\n就[在心上超过]没有经历过的人们了。', gap: 0.8 },
  { section: 'heart', speak: '所以，别害怕了。', show: '所以，[别害怕了]。', gap: 1.2 },

  // 49-54 — dawn road
  { section: 'dawn', speak: '往前走，去迎接为你铺就的道路和使命吧。', show: '往前走，\n去迎接为你铺就的[道路和使命]吧。', gap: 0.7 },
  { section: 'dawn', speak: '如果你迷茫，就来素问问吧。', show: '如果你迷茫，就来[素问问]吧。', gap: 0.5 },
  { section: 'dawn', speak: '如果你需要伙伴，我们会在这里。', show: '如果你需要伙伴，[我们会在这里]。', gap: 0.5 },
  { section: 'dawn', speak: '我们之中，不知有多少，是从你这条路上走过来的。', show: '我们之中不知有多少\n是[从你这条路上走过来的]。', gap: 0.7 },
  { section: 'dawn', speak: '能走通的。', show: '[能走通的]。', gap: 1.0 },
  { section: 'go', speak: '出发吧。', show: '出发吧。', gap: 2.0 },
];

// From ../参考源.md, shown under the logo on the end card.
export const SOURCE = {
  tag: '#1.01#',
  title: '患有抑郁焦虑症的学生恐惧学校，但是又渴望学习该怎么迈出第1步？',
  url: 'https://sooon.ai/p/s/smaHWT40jYlv8Ry2eLV1R',
};

export const LEAD_IN = 1.4;   // silence before the first line
export const OUTRO = 6.0;     // logo end card after the last gap
