-- ============================================================
-- 0028_aptitude_question_bank_seed -- 2026-09-30
-- The aptitude bank launched with only 1-3 sample questions per
-- topic (53 total across the 19 existing aptitude_topics rows) --
-- not enough for real practice. Seeds 10 additional original
-- questions per existing topic (190 new rows total), written fresh
-- for this seed (not sourced from any external question bank),
-- spanning easy/medium/hard difficulty. created_by is left null
-- (system-authored), which the schema already allows.
--
-- Idempotent via a `where not exists` guard on (topic_id, prompt),
-- same posture as 0021_interview_prep_seed.sql. Assumes the 19
-- aptitude_topics rows from 0015_topics.sql already exist -- if a
-- topic name below isn't found, that topic's rows simply insert
-- zero rows (no error).
-- ============================================================

-- ---------- QUANT: Percentages ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'quant', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('40% of 250 is:', '["90","100","110","120"]'::jsonb, 1, '40% of 250 = 0.4 x 250 = 100.', 'easy'),
  ('What is 15% of 15% of 4000?', '["72","80","90","96"]'::jsonb, 2, '15% of 4000 = 600. 15% of 600 = 90.', 'easy'),
  ('A number is increased by 25% and then decreased by 20%. What is the net percentage change?', '["No change","5% increase","5% decrease","10% increase"]'::jsonb, 0, 'Net change = 25 - 20 + (25)(-20)/100 = 5 - 5 = 0%. Using multipliers: 1.25 x 0.8 = 1.0, i.e. no change.', 'medium'),
  ('In an election between two candidates, the winner gets 60% of the votes and wins by 200 votes. What is the total number of votes cast?', '["800","900","1000","1200"]'::jsonb, 2, 'Winning margin = 60% - 40% = 20% of total votes = 200, so total votes = 200 / 0.20 = 1000.', 'medium'),
  ('The price of sugar falls by 20%. By what percentage should consumption increase so that expenditure on sugar remains unchanged?', '["20%","25%","30%","16.67%"]'::jsonb, 1, 'Required increase = (20 / (100 - 20)) x 100 = (20/80) x 100 = 25%.', 'medium'),
  ('A''s salary is 20% more than B''s salary. By what percentage is B''s salary less than A''s?', '["16.67%","20%","25%","15%"]'::jsonb, 0, 'If B = 100, A = 120. B is less than A by (20/120) x 100 = 16.67%.', 'hard'),
  ('If 30% of a number is 90, what is the number?', '["250","270","300","320"]'::jsonb, 2, 'Number = 90 / 0.30 = 300.', 'easy'),
  ('In a class, 60% of the students are boys and the rest are girls. If there are 40 girls, what is the total number of students?', '["80","90","100","120"]'::jsonb, 2, 'Girls are 40% of the total. Total = 40 / 0.40 = 100.', 'medium'),
  ('The population of a town increases by 10% every year. If the current population is 24200, what was the population two years ago?', '["19800","20000","20500","22000"]'::jsonb, 1, 'Let P be the population two years ago. P x 1.1 x 1.1 = 24200, so P x 1.21 = 24200, giving P = 20000.', 'hard'),
  ('Two numbers are respectively 20% and 50% more than a third number. What is the ratio of the two numbers?', '["4:5","5:4","2:3","3:2"]'::jsonb, 0, 'Let the third number be 100. The two numbers are 120 and 150, giving a ratio of 120:150 = 4:5.', 'medium')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'quant' and tpc.name = 'Percentages'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- QUANT: Profit and Loss ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'quant', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('An article bought for Rs. 500 is sold for Rs. 600. What is the profit percentage?', '["10%","15%","20%","25%"]'::jsonb, 2, 'Profit = 600 - 500 = 100. Profit% = (100/500) x 100 = 20%.', 'easy'),
  ('An article bought for Rs. 800 is sold at a loss of 10%. What is the selling price?', '["Rs. 700","Rs. 720","Rs. 740","Rs. 760"]'::jsonb, 1, 'Selling price = 800 x 0.90 = Rs. 720.', 'easy'),
  ('A shopkeeper marks the price of an item 25% above its cost price and then gives a 10% discount on the marked price. What is his profit percentage?', '["10%","12.5%","15%","20%"]'::jsonb, 1, 'Let cost price = 100. Marked price = 125. Selling price = 125 x 0.90 = 112.5, so profit = 12.5%.', 'medium'),
  ('By selling an article for Rs. 450, a man loses 10%. At what price should he sell it to gain 10%?', '["Rs. 500","Rs. 540","Rs. 550","Rs. 560"]'::jsonb, 2, 'Cost price = 450 / 0.90 = 500. Selling price for 10% gain = 500 x 1.10 = Rs. 550.', 'medium'),
  ('A dishonest dealer claims to sell goods at cost price but uses a weight of 900 gm instead of 1 kg. What is his profit percentage?', '["10%","11.11%","12%","9%"]'::jsonb, 1, 'Profit% = (shortfall / actual weight given) x 100 = (100/900) x 100 = 11.11%.', 'hard'),
  ('If the cost price of 12 articles equals the selling price of 10 articles, what is the profit percentage?', '["10%","16.67%","20%","25%"]'::jsonb, 2, 'Let cost price of each article = 1, so cost price of 12 = 12 = selling price of 10, giving selling price of each = 1.2. Profit% = 20%.', 'medium'),
  ('An item marked at Rs. 1000 is sold after a 20% discount. What is the selling price?', '["Rs. 750","Rs. 780","Rs. 800","Rs. 820"]'::jsonb, 2, 'Selling price = 1000 x 0.80 = Rs. 800.', 'easy'),
  ('A man sells two items, each for Rs. 600, one at a 20% profit and the other at a 20% loss. What is the overall result of the two transactions?', '["No profit no loss","4% profit","4% loss","5% loss"]'::jsonb, 2, 'When two items are sold at the same price with equal percentage profit and loss, there is always an overall loss of (common%)^2 / 100 = 400/100 = 4%.', 'medium'),
  ('A trader marks his goods 40% above the cost price and allows a discount of 25%. What is his gain percentage?', '["5%","10%","15%","8%"]'::jsonb, 0, 'Let cost price = 100. Marked price = 140. Selling price = 140 x 0.75 = 105, so gain = 5%.', 'hard'),
  ('The cost price of 20 articles equals the selling price of x articles. If the profit is 25%, what is the value of x?', '["15","16","18","20"]'::jsonb, 1, 'Let cost price per article = 1, so cost price of 20 = 20. With 25% profit, selling price per article = 1.25. Since selling price of x articles = 20, x = 20 / 1.25 = 16.', 'medium')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'quant' and tpc.name = 'Profit and Loss'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- QUANT: Ratio and Proportion ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'quant', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Simplify the ratio 45:60 to its lowest form.', '["3:4","4:5","2:3","5:6"]'::jsonb, 0, 'The HCF of 45 and 60 is 15. Dividing both terms by 15 gives 3:4.', 'easy'),
  ('If a:b = 2:3 and b:c = 4:5, what is a:b:c?', '["8:12:15","2:3:5","2:4:5","6:9:15"]'::jsonb, 0, 'Scale a:b (2:3) to 8:12 and b:c (4:5) to 12:15 so that b matches in both. This gives a:b:c = 8:12:15.', 'medium'),
  ('Two numbers are in the ratio 3:5. If their sum is 96, what are the two numbers?', '["30, 66","36, 60","40, 56","32, 64"]'::jsonb, 1, 'Let the numbers be 3x and 5x, so 8x = 96, giving x = 12. The numbers are 36 and 60.', 'medium'),
  ('Rs. 1050 is divided among A, B, and C in the ratio 2:3:5. What is B''s share?', '["Rs. 200","Rs. 210","Rs. 315","Rs. 350"]'::jsonb, 2, 'Total parts = 2 + 3 + 5 = 10. B''s share = (3/10) x 1050 = Rs. 315.', 'medium'),
  ('If x:y = 3:4, what is the value of (4x + 5y):(5x - 2y)?', '["32:7","7:32","28:9","9:28"]'::jsonb, 0, 'Let x = 3, y = 4. Then 4x + 5y = 12 + 20 = 32 and 5x - 2y = 15 - 8 = 7, giving a ratio of 32:7.', 'hard'),
  ('The ratio of boys to girls in a class is 5:4. If there are 45 boys, how many girls are there?', '["30","32","36","40"]'::jsonb, 2, 'One unit = 45/5 = 9. Girls = 4 x 9 = 36.', 'easy'),
  ('A sum of money is divided among A, B, and C such that A gets twice as much as B, and B gets twice as much as C. If C gets Rs. 300, what is the total sum?', '["Rs. 1800","Rs. 2000","Rs. 2100","Rs. 2400"]'::jsonb, 2, 'C = 300, B = 600, A = 1200. Total = 300 + 600 + 1200 = Rs. 2100.', 'medium'),
  ('The ratio of two numbers is 4:5 and their LCM is 180. What is the larger number?', '["36","40","45","50"]'::jsonb, 2, 'Let the numbers be 4x and 5x. Since they share no common factor beyond x, their LCM is 20x. So 20x = 180, giving x = 9. The larger number is 5 x 9 = 45.', 'hard'),
  ('If a:b = 5:6 and b:c = 8:9, what is a:c?', '["20:27","5:9","15:18","10:18"]'::jsonb, 0, 'Scale b to a common value of 24: a:b becomes 20:24 and b:c becomes 24:27. So a:c = 20:27.', 'medium'),
  ('What number must be added to each term of the ratio 3:5 so that it becomes 5:6?', '["5","6","7","8"]'::jsonb, 2, 'Let x be added to each term: (3+x)/(5+x) = 5/6. Cross-multiplying: 6(3+x) = 5(5+x), so 18 + 6x = 25 + 5x, giving x = 7.', 'easy')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'quant' and tpc.name = 'Ratio and Proportion'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- QUANT: Simple and Compound Interest ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'quant', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Find the simple interest on Rs. 2000 at 5% per annum for 3 years.', '["Rs. 250","Rs. 280","Rs. 300","Rs. 320"]'::jsonb, 2, 'SI = (P x R x T) / 100 = (2000 x 5 x 3) / 100 = Rs. 300.', 'easy'),
  ('What principal earns a simple interest of Rs. 600 in 4 years at 5% per annum?', '["Rs. 2500","Rs. 2800","Rs. 3000","Rs. 3200"]'::jsonb, 2, 'P = (SI x 100) / (R x T) = (600 x 100) / (5 x 4) = Rs. 3000.', 'easy'),
  ('Find the compound interest on Rs. 5000 for 2 years at 10% per annum, compounded annually.', '["Rs. 1000","Rs. 1050","Rs. 1100","Rs. 1200"]'::jsonb, 1, 'Amount = 5000 x (1.10)^2 = 5000 x 1.21 = Rs. 6050. Compound interest = 6050 - 5000 = Rs. 1050.', 'medium'),
  ('The simple interest on a sum for 2 years at 8% per annum is Rs. 800. What is the compound interest on the same sum for the same period and rate?', '["Rs. 800","Rs. 816","Rs. 832","Rs. 850"]'::jsonb, 2, 'From SI: Principal = (800 x 100) / (8 x 2) = Rs. 5000. Compound interest = 5000 x ((1.08)^2 - 1) = 5000 x 0.1664 = Rs. 832.', 'medium'),
  ('A sum of money doubles itself in 8 years at simple interest. Find the rate of interest per annum.', '["10%","12.5%","15%","8%"]'::jsonb, 1, 'If the sum doubles, the interest earned equals the principal in 8 years. Rate = (100 x P) / (P x 8) = 12.5%.', 'hard'),
  ('At what rate percent per annum will Rs. 1200 amount to Rs. 1560 in 3 years at simple interest?', '["8%","10%","12%","15%"]'::jsonb, 1, 'SI = 1560 - 1200 = 360. Rate = (SI x 100) / (P x T) = (360 x 100) / (1200 x 3) = 10%.', 'medium'),
  ('The difference between the compound interest and the simple interest on a sum for 2 years at 10% per annum is Rs. 50. Find the sum.', '["Rs. 4000","Rs. 4500","Rs. 5000","Rs. 5500"]'::jsonb, 2, 'For 2 years, the difference between CI and SI equals P x (R/100)^2. So P x 0.01 = 50, giving P = Rs. 5000.', 'hard'),
  ('Find the amount on Rs. 8000 at 5% per annum, compounded annually, for 2 years.', '["Rs. 8700","Rs. 8800","Rs. 8820","Rs. 8900"]'::jsonb, 2, 'Amount = 8000 x (1.05)^2 = 8000 x 1.1025 = Rs. 8820.', 'medium'),
  ('At a simple interest rate of 6% per annum, find the interest on Rs. 1500 for 4 years.', '["Rs. 320","Rs. 340","Rs. 360","Rs. 380"]'::jsonb, 2, 'SI = (1500 x 6 x 4) / 100 = Rs. 360.', 'easy'),
  ('A sum amounts to Rs. 7350 in 2 years and Rs. 8575 in 3 years at simple interest. Find the sum and the rate of interest.', '["Rs. 4900 at 25%","Rs. 5000 at 20%","Rs. 4800 at 22%","Rs. 5200 at 24%"]'::jsonb, 0, 'The interest for one year = 8575 - 7350 = Rs. 1225. Sum after 2 years = Principal + 2 x 1225, so Principal = 7350 - 2450 = Rs. 4900. Rate = (1225 x 100) / 4900 = 25%.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'quant' and tpc.name = 'Simple and Compound Interest'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- QUANT: Time and Work ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'quant', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('A can do a piece of work in 10 days and B can do it in 15 days. In how many days can they finish the work together?', '["5 days","6 days","7 days","8 days"]'::jsonb, 1, 'Combined rate = 1/10 + 1/15 = 1/6, so together they finish in 6 days.', 'easy'),
  ('A does a piece of work in 20 days. What fraction of the work does he complete in 5 days?', '["1/5","1/4","1/3","2/5"]'::jsonb, 1, 'In 5 days, A completes 5/20 = 1/4 of the work.', 'easy'),
  ('A and B together can complete a work in 12 days. A alone can do it in 20 days. In how many days can B alone complete it?', '["24 days","28 days","30 days","32 days"]'::jsonb, 2, 'B''s rate = 1/12 - 1/20 = (5-3)/60 = 2/60 = 1/30, so B alone takes 30 days.', 'medium'),
  ('12 men can complete a work in 8 days. How many men are needed to complete the same work in 6 days?', '["14","15","16","18"]'::jsonb, 2, 'Men x Days is constant: 12 x 8 = 96 = Men2 x 6, so Men2 = 16.', 'medium'),
  ('A can do a work in 15 days and B in 20 days. They work together for 4 days, after which A leaves. In how many more days will B finish the remaining work?', '["10 days","10.67 days","11 days","9.5 days"]'::jsonb, 1, 'Combined rate per day = 1/15 + 1/20 = 7/60. Work done in 4 days = 28/60 = 7/15. Remaining work = 8/15. Days needed by B = (8/15) / (1/20) = 160/15 = 10.67 days.', 'hard'),
  ('6 women can do as much work as 4 men. If 8 men and 12 women work together, how many men''s work is this equivalent to?', '["14","15","16","18"]'::jsonb, 2, 'Since 4 men = 6 women, 1 man = 1.5 women. So 8 men = 12 women. Total work = 12 + 12 = 24 women''s work, which equals 24 / 1.5 = 16 men''s work.', 'medium'),
  ('A, B, and C can complete a work in 10, 12, and 15 days respectively. They start together, but A leaves after 2 days, and B leaves 3 days before the work is completed. In how many days is the work completed?', '["6 days","7 days","8 days","9 days"]'::jsonb, 1, 'Let the total time be D days. Work done: 2/10 + (D-3)/12 + D/15 = 1. Multiplying by 60: 12 + 5(D-3) + 4D = 60, giving 9D - 3 = 60, so D = 7.', 'hard'),
  ('If 5 men can complete a work in 12 days, how many days will 10 men take to complete the same work?', '["4","5","6","8"]'::jsonb, 2, 'Doubling the number of men halves the time: 12/2 = 6 days.', 'easy'),
  ('A can finish a work in 18 days and B can finish it in 15 days. B worked for 10 days and then left. In how many days will A finish the remaining work?', '["4","5","6","7"]'::jsonb, 2, 'B''s work in 10 days = 10/15 = 2/3. Remaining work = 1/3. A''s rate = 1/18. Time needed = (1/3) / (1/18) = 6 days.', 'medium'),
  ('4 men and 6 women can complete a work in 8 days, while 3 men and 7 women can complete it in 10 days. In how many days will 10 women alone complete the work?', '["35 days","38 days","40 days","45 days"]'::jsonb, 2, 'Let a man''s daily rate be m and a woman''s be w. 4m + 6w = 1/8 and 3m + 7w = 1/10. Solving these simultaneously gives w = 1/400, so 10 women''s combined rate is 10/400 = 1/40, meaning they take 40 days.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'quant' and tpc.name = 'Time and Work'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- QUANT: Time, Speed and Distance ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'quant', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('A car travels 180 km in 3 hours. What is its speed?', '["50 km/h","55 km/h","60 km/h","65 km/h"]'::jsonb, 2, 'Speed = Distance / Time = 180 / 3 = 60 km/h.', 'easy'),
  ('Convert 72 km/h into metres per second.', '["15 m/s","18 m/s","20 m/s","22 m/s"]'::jsonb, 2, 'To convert km/h to m/s, multiply by 5/18: 72 x 5/18 = 20 m/s.', 'easy'),
  ('A train 150 m long crosses a pole in 15 seconds. Find its speed in km/h.', '["30 km/h","33 km/h","36 km/h","40 km/h"]'::jsonb, 2, 'Speed = 150/15 = 10 m/s. Converting to km/h: 10 x 18/5 = 36 km/h.', 'medium'),
  ('Two trains start from stations A and B, 300 km apart, at the same time and travel towards each other at 50 km/h and 70 km/h respectively. After how many hours will they meet?', '["2 hours","2.5 hours","3 hours","3.5 hours"]'::jsonb, 1, 'Relative speed = 50 + 70 = 120 km/h. Time to meet = 300 / 120 = 2.5 hours.', 'medium'),
  ('A man rows 24 km downstream in 4 hours and 12 km upstream in 4 hours. Find his speed in still water and the speed of the current.', '["4.5 km/h, 1.5 km/h","5 km/h, 1 km/h","4 km/h, 2 km/h","6 km/h, 1.5 km/h"]'::jsonb, 0, 'Downstream speed = 24/4 = 6 km/h. Upstream speed = 12/4 = 3 km/h. Speed in still water = (6+3)/2 = 4.5 km/h. Speed of current = (6-3)/2 = 1.5 km/h.', 'hard'),
  ('A boat''s speed in still water is 8 km/h and the speed of the current is 2 km/h. How long will it take to cover 30 km downstream?', '["2 hours","2.5 hours","3 hours","3.5 hours"]'::jsonb, 2, 'Downstream speed = 8 + 2 = 10 km/h. Time = 30/10 = 3 hours.', 'medium'),
  ('A man walks at 5 km/h and covers a certain distance in 3 hours. What distance did he cover?', '["10 km","12 km","15 km","18 km"]'::jsonb, 2, 'Distance = Speed x Time = 5 x 3 = 15 km.', 'easy'),
  ('Two trains of length 120 m and 180 m run on parallel tracks in the same direction at 54 km/h and 36 km/h respectively. Find the time taken by the faster train to completely cross the slower train.', '["50 seconds","55 seconds","60 seconds","65 seconds"]'::jsonb, 2, 'Relative speed = 54 - 36 = 18 km/h = 5 m/s. Total length to cover = 120 + 180 = 300 m. Time = 300/5 = 60 seconds.', 'hard'),
  ('A car covers a certain distance in 8 hours at 60 km/h. At what speed should it travel to cover the same distance in 6 hours?', '["70 km/h","75 km/h","80 km/h","85 km/h"]'::jsonb, 2, 'Distance = 60 x 8 = 480 km. Required speed = 480/6 = 80 km/h.', 'medium'),
  ('Excluding stoppages, the speed of a train is 60 km/h, and including stoppages it is 48 km/h. For how many minutes does the train stop per hour?', '["10 minutes","12 minutes","15 minutes","18 minutes"]'::jsonb, 1, 'Speed lost due to stoppages = 60 - 48 = 12 km/h out of 60 km/h. Time stopped per hour = (12/60) x 60 = 12 minutes.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'quant' and tpc.name = 'Time, Speed and Distance'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Blood Relations ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('A is the father of B. C is the sister of B. How is C related to A?', '["Daughter","Son","Sister","Mother"]'::jsonb, 0, 'Since C is B''s sister and A is B''s father, C is also A''s daughter.', 'easy'),
  ('P is the brother of Q. Q is the sister of R. R is the father of S. How is Q related to S?', '["Aunt","Mother","Sister","Grandmother"]'::jsonb, 0, 'Q is R''s sister, and R is S''s father, so Q is S''s paternal aunt.', 'easy'),
  ('Pointing to a man, Rita said, "His mother is the only daughter of my mother." How is Rita related to the man?', '["Mother","Sister","Aunt","Grandmother"]'::jsonb, 0, 'The only daughter of Rita''s mother is Rita herself, so Rita is the man''s mother.', 'medium'),
  ('A is the son of B. B is the sister of C. C is the mother of D. How is A related to D?', '["Cousin","Brother","Nephew","Uncle"]'::jsonb, 0, 'B is A''s mother and B''s sister is C, so A and D (C''s child) are cousins.', 'medium'),
  ('Introducing a boy, a girl said, "His mother is the only daughter of my father." How is the girl related to the boy?', '["Mother","Sister","Aunt","Niece"]'::jsonb, 0, 'The only daughter of the girl''s father is the girl herself, so the girl is the boy''s mother.', 'medium'),
  ('A''s mother is B''s sister. C is B''s father. D is C''s mother. How is D related to A?', '["Great-grandmother","Grandmother","Mother","Aunt"]'::jsonb, 0, 'B''s sister is A''s mother, so B''s father C is A''s grandfather, and C''s mother D is A''s great-grandmother.', 'hard'),
  ('Introducing a man, a woman said, "He is the son of my husband''s father." Assuming she has only one brother-in-law from this side, how is the man related to the woman?', '["Brother-in-law","Husband","Son","Father-in-law"]'::jsonb, 0, 'The son of the woman''s husband''s father, other than the husband himself, is the husband''s brother, i.e. the woman''s brother-in-law.', 'easy'),
  ('Deepak said to Nitin, "That boy playing football is the younger of the two brothers of the daughter of my father''s wife." How is the boy related to Deepak?', '["Younger brother","Elder brother","Son","Cousin"]'::jsonb, 0, 'My father''s wife is Deepak''s mother, and her daughter is Deepak''s sister. The younger of her two brothers, other than Deepak himself, is Deepak''s younger brother.', 'medium'),
  ('A is B''s sister. C is B''s mother. D is C''s father. How is A related to D?', '["Granddaughter","Daughter","Sister","Niece"]'::jsonb, 0, 'C is B''s mother, and A is also C''s daughter since A is B''s sister. D is C''s father, making D the grandfather of A, so A is D''s granddaughter.', 'medium'),
  ('Pointing to a photograph of a boy, Suresh said, "He is the son of the only son of my grandfather." Assuming Suresh has only one brother from this side, how is the boy related to Suresh?', '["Brother","Son","Cousin","Nephew"]'::jsonb, 0, 'The only son of Suresh''s grandfather is Suresh''s father, so the boy, being that son''s son, is Suresh''s brother.', 'medium')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Blood Relations'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Coding-Decoding ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('If CAT is coded as DBU, what is the code for DOG (using the same letter-shift rule)?', '["EPH","EPI","FQH","EQH"]'::jsonb, 0, 'Each letter in CAT is shifted forward by one place to get DBU. Applying the same shift to DOG: D to E, O to P, G to H, giving EPH.', 'easy'),
  ('If A=1, B=2, C=3, and so on up to Z=26, what is the code for the word CAB?', '["3-1-2","1-2-3","2-1-3","3-2-1"]'::jsonb, 0, 'C=3, A=1, B=2, so the code is 3-1-2.', 'easy'),
  ('If BOOK is coded as CPPL, how is WORD coded using the same rule?', '["XPSE","XPSD","YPSE","XQSE"]'::jsonb, 0, 'Each letter of BOOK is shifted forward by one to get CPPL. Applying the same shift to WORD: W to X, O to P, R to S, D to E, giving XPSE.', 'medium'),
  ('In a certain code, MOUSE is written as NPVTF. How is TIGER written in that code?', '["UJHFS","UJHFR","UKHFS","VJHFS"]'::jsonb, 0, 'Each letter of MOUSE is shifted forward by one to get NPVTF. Applying the same shift to TIGER: T to U, I to J, G to H, E to F, R to S, giving UJHFS.', 'medium'),
  ('If PAINT is coded as 74125 and EXIT is coded as 8925 (with I consistently coded as 1 and T as 5), what is the code for TIP?', '["517","715","571","157"]'::jsonb, 0, 'From the given codes, P=7, A=4, I=1, N=2, T=5, E=8, X=9. So TIP is coded as T-I-P = 5-1-7 = 517.', 'hard'),
  ('In a code language, each letter is replaced by the letter 2 positions ahead in the alphabet, cyclically. If FLOWER is coded as HNQYGT, what is the code for GARDEN?', '["ICTFGP","ICTFGO","IBTFGP","ICSFGP"]'::jsonb, 0, 'Shifting each letter of GARDEN forward by 2: G to I, A to C, R to T, D to F, E to G, N to P, giving ICTFGP.', 'medium'),
  ('If TEACHER is coded as VGCEJGT (each letter shifted forward by 2), what is the code for STUDENT using the same rule?', '["UVWFGPV","UVWFGPU","UWWFGPV","UVXFGPV"]'::jsonb, 0, 'Shifting each letter of STUDENT forward by 2: S to U, T to V, U to W, D to F, E to G, N to P, T to V, giving UVWFGPV.', 'medium'),
  ('Using alphabet positions (A=1, B=2, ... Z=26), GO is coded as 715 and SO is coded as 1915. What is the code for TO using the same rule?', '["2015","2016","1520","2115"]'::jsonb, 0, 'T is the 20th letter and O is the 15th letter, so TO is coded as 2015, matching the pattern used for GO (7-15) and SO (19-15).', 'medium'),
  ('In a code, each letter of a word is replaced by the letter that occupies the opposite position in the alphabet (A with Z, B with Y, and so on). What is the code for PEN?', '["KVM","KVN","LVM","KWM"]'::jsonb, 0, 'P (16th letter) maps to the 27-16=11th letter, K. E (5th) maps to the 22nd letter, V. N (14th) maps to the 13th letter, M. So PEN becomes KVM.', 'hard'),
  ('If CANDLE is written as DBOEMF (each letter shifted forward by 1), what is the code for TABLE using the same rule?', '["UBCMF","UBCMG","VBCMF","UCCMF"]'::jsonb, 0, 'Shifting each letter of TABLE forward by 1: T to U, A to B, B to C, L to M, E to F, giving UBCMF.', 'medium')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Coding-Decoding'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Direction Sense ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('A man walks 5 km towards North, then turns right and walks 3 km. In which direction is he now facing?', '["East","West","North","South"]'::jsonb, 0, 'Facing North and turning right means he now faces East.', 'easy'),
  ('Starting from a point, Rahul walks 10 m South, then turns left and walks 10 m. In which direction is he now facing?', '["East","West","North","South"]'::jsonb, 0, 'Facing South, a left turn means he now faces East.', 'easy'),
  ('A man walks 4 km East, then turns left and walks 4 km, then turns left again and walks 4 km. How far, and in which direction, is he from his starting point?', '["4 km North","4 km East","8 km North","4 km South"]'::jsonb, 0, 'The path is East 4 km, then North 4 km, then West 4 km. The East and West legs cancel out, leaving a net displacement of 4 km North.', 'medium'),
  ('Point A is 8 km East of point B. Point C is 6 km North of point A. What is the shortest distance between B and C?', '["10 km","12 km","14 km","8 km"]'::jsonb, 0, 'B, A, and C form a right triangle with legs 8 km and 6 km. The distance BC = square root of (8^2 + 6^2) = square root of 100 = 10 km.', 'medium'),
  ('Ravi walks 3 km towards North from his house, then turns right and walks 4 km, then turns right again and walks 3 km. How far, and in which direction, is he from his house?', '["4 km East","4 km West","6 km East","3 km North"]'::jsonb, 0, 'The path is North 3 km, East 4 km, South 3 km. The North and South legs cancel, leaving a net displacement of 4 km East.', 'medium'),
  ('If South-East becomes North and North-East becomes West (the same rotation applied to all directions), what will West become?', '["South-East","North-West","South-West","North-East"]'::jsonb, 0, 'Both given clues correspond to rotating every direction by 135 degrees counter-clockwise. Applying the same rotation to West (270 degrees from North) gives 270 - 135 = 135 degrees, which is South-East.', 'hard'),
  ('A man facing North turns 90 degrees clockwise, then turns 180 degrees more. Which direction is he facing now?', '["West","East","South","North"]'::jsonb, 0, 'North turned 90 degrees clockwise faces East. Turning 180 degrees more from East faces West.', 'easy'),
  ('Town B is North of Town A. Town C is East of Town B. Town D is South of Town C, at the same latitude as Town B. In which direction is Town D with respect to Town A?', '["East","West","North","South"]'::jsonb, 0, 'Since D is brought back to Town B''s latitude while retaining Town C''s eastward offset, D ends up directly East of Town A.', 'medium'),
  ('A person walks 6 km towards North, then walks 5 km towards South, and then walks 3 km towards East. How far is he from his starting point?', '["Square root of 10 km, North-East of start","3 km East","4 km North","1 km North"]'::jsonb, 0, 'Net North displacement = 6 - 5 = 1 km. East displacement = 3 km. Distance from start = square root of (1^2 + 3^2) = square root of 10 km, in the North-East direction.', 'hard'),
  ('A person walks 8 km towards West, then walks 6 km towards North. How far is he from his starting point?', '["10 km","12 km","14 km","8 km"]'::jsonb, 0, 'Distance = square root of (8^2 + 6^2) = square root of 100 = 10 km.', 'medium')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Direction Sense'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Number Series ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Find the next term: 2, 4, 6, 8, 10, ?', '["11","12","13","14"]'::jsonb, 1, 'The series increases by 2 each time, so the next term is 12.', 'easy'),
  ('Find the next term: 3, 6, 12, 24, ?', '["36","42","48","54"]'::jsonb, 2, 'Each term is double the previous one, so the next term is 24 x 2 = 48.', 'easy'),
  ('Find the next term: 1, 4, 9, 16, 25, ?', '["30","32","36","49"]'::jsonb, 2, 'The series consists of perfect squares: 1^2, 2^2, 3^2, 4^2, 5^2, 6^2. The next term is 36.', 'medium'),
  ('Find the next term: 5, 11, 17, 23, ?', '["27","28","29","30"]'::jsonb, 2, 'Each term increases by 6, so the next term is 23 + 6 = 29.', 'medium'),
  ('Find the next term: 2, 3, 5, 8, 13, ?', '["18","20","21","24"]'::jsonb, 2, 'Each term is the sum of the two previous terms (a Fibonacci-style series): 8 + 13 = 21.', 'medium'),
  ('Find the next term: 1, 2, 6, 24, 120, ?', '["600","720","840","960"]'::jsonb, 1, 'The series consists of factorials: 1!, 2!, 3!, 4!, 5!, 6!. The next term is 6! = 720.', 'hard'),
  ('Find the next term: 7, 14, 28, 56, ?', '["98","102","110","112"]'::jsonb, 3, 'Each term is double the previous one, so the next term is 56 x 2 = 112.', 'medium'),
  ('Find the next term: 4, 9, 16, 25, 36, ?', '["42","45","47","49"]'::jsonb, 3, 'The series consists of perfect squares starting from 2^2: 2^2, 3^2, 4^2, 5^2, 6^2, 7^2. The next term is 49.', 'hard'),
  ('Find the next term: 100, 90, 81, 73, ?', '["64","65","66","68"]'::jsonb, 2, 'The differences between consecutive terms are -10, -9, -8, so the next difference is -7, giving 73 - 7 = 66.', 'medium'),
  ('Find the next term: 3, 7, 15, 31, 63, ?', '["95","110","120","127"]'::jsonb, 3, 'Each term follows the rule: multiply the previous term by 2 and add 1. So the next term is 63 x 2 + 1 = 127.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Number Series'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Seating Arrangement ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Five friends A, B, C, D, and E sit in a row facing North. B is to the immediate right of A. C is to the immediate right of B. Who sits between A and C?', '["B","D","E","A"]'::jsonb, 0, 'Since the order is A, B, C from left to right, B sits between A and C.', 'easy'),
  ('In a row of children facing North, P is to the immediate left of Q, and R is to the immediate right of Q. Who is immediately to the right of Q?', '["R","P","Q","Cannot be determined"]'::jsonb, 0, 'By the given arrangement (P, Q, R from left to right), R is immediately to the right of Q.', 'easy'),
  ('Six friends A, B, C, D, E, and F sit in a row. D is second from the left end. A is immediately to the right of D. F is immediately to the right of A. B is at the right end. Who sits third from the right end?', '["F","A","C","E"]'::jsonb, 0, 'The order from left to right is: (position 1), D, A, F, (position 5), B. B is at position 6 (right end), so counting from the right: B(1st), position5(2nd), F(3rd). F sits third from the right end.', 'medium'),
  ('Four friends A, B, C, and D sit around a circular table facing the center. A is directly opposite C. B is to the immediate right of A. Who is to the immediate left of A?', '["D","B","C","Cannot be determined"]'::jsonb, 0, 'With 4 people around the table, A''s opposite is C, and the two remaining seats are immediately to A''s left and right. Since B is to A''s right, D must be to A''s left.', 'medium'),
  ('Six people A, B, C, D, E, and F sit in a row facing North. Only two people sit between A and B. C sits immediately to the right of B. Only one person sits between C and D. E sits immediately to the left of D. F sits at one of the ends, and A is not at either end. How many people sit between E and A?', '["0","1","2","3"]'::jsonb, 0, 'Working out the arrangement from the clues gives the order (left to right): F, A, E, D, B, C. E and A are adjacent, so 0 people sit between them.', 'hard'),
  ('In a row, M sits third from the left end, and there are three people to the right of M. How many people are in the row?', '["5","6","7","8"]'::jsonb, 1, 'Third from the left means 2 people are to M''s left. Adding M and the 3 people to his right: 2 + 1 + 3 = 6.', 'easy'),
  ('In a row of students facing the teacher, Neha is 7th from the left and 12th from the right. How many students are in the row?', '["17","18","19","20"]'::jsonb, 1, 'Total students = (position from left) + (position from right) - 1 = 7 + 12 - 1 = 18.', 'medium'),
  ('In a row of boys, Arjun is 15th from the left and 8th from the right. How many boys are there in total?', '["20","21","22","23"]'::jsonb, 2, 'Total boys = 15 + 8 - 1 = 22.', 'medium'),
  ('In a class of 40 students, Kunal''s rank from the top is 17th. What is his rank from the bottom?', '["22nd","23rd","24th","25th"]'::jsonb, 2, 'Rank from the bottom = Total students - Rank from top + 1 = 40 - 17 + 1 = 24th.', 'hard'),
  ('In a row of friends facing North, R is fourth from the left end and fifth from the right end. How many friends are sitting in the row in total?', '["7","8","9","10"]'::jsonb, 1, 'Total = 4 + 5 - 1 = 8.', 'medium')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Seating Arrangement'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Series Completion ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Find the next term: A, C, E, G, ?', '["H","I","J","K"]'::jsonb, 1, 'The series skips one letter each time (A, skip B, C, skip D, E...), so after G, skipping H gives I.', 'easy'),
  ('Find the next term: Z, X, V, T, ?', '["Q","R","S","P"]'::jsonb, 1, 'The series moves backward by 2 letters each time (Z, X, V, T...), so after T, moving back 2 gives R.', 'easy'),
  ('Find the next term: B, D, G, K, ?', '["N","O","P","Q"]'::jsonb, 2, 'The gaps between terms increase by one each time: +2, +3, +4, so the next gap is +5, giving K + 5 = P.', 'medium'),
  ('Find the next term: AZ, BY, CX, DW, ?', '["EV","EU","FV","EW"]'::jsonb, 0, 'The first letter of each pair moves forward through the alphabet (A, B, C, D...) while the second letter moves backward (Z, Y, X, W...). The next pair is EV.', 'medium'),
  ('Find the next term: 3, 8, 15, 24, 35, ?', '["45","46","48","50"]'::jsonb, 2, 'The differences between consecutive terms are 5, 7, 9, 11, so the next difference is 13, giving 35 + 13 = 48.', 'medium'),
  ('Find the next term: 2, 5, 10, 17, 26, ?', '["35","37","39","41"]'::jsonb, 1, 'The differences between consecutive terms are 3, 5, 7, 9, so the next difference is 11, giving 26 + 11 = 37.', 'hard'),
  ('Find the odd one out: 27, 64, 100, 125.', '["27","64","100","125"]'::jsonb, 2, '27, 64, and 125 are perfect cubes (3^3, 4^3, 5^3), but 100 is not a perfect cube.', 'easy'),
  ('Find the odd one out: Triangle, Square, Circle, Hexagon.', '["Triangle","Square","Circle","Hexagon"]'::jsonb, 2, 'Triangle, Square, and Hexagon are polygons with straight sides, but a Circle has no straight sides or angles.', 'medium'),
  ('Find the missing term in the series: CMM, EOO, GQQ, ?, KUU.', '["ISS","GSS","IQQ","HSS"]'::jsonb, 0, 'The first letter advances by 2 each time (C, E, G, I, K), and the repeated letters also advance by 2 each time (MM, OO, QQ, SS, UU). The missing term is ISS.', 'medium'),
  ('Find the odd one out: 144, 169, 200, 225.', '["144","169","200","225"]'::jsonb, 2, '144, 169, and 225 are perfect squares (12^2, 13^2, 15^2), but 200 is not a perfect square.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Series Completion'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- LOGICAL: Syllogisms ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'logical', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Statements: All dogs are animals. All animals are living beings. Conclusions: I. All dogs are living beings. II. All living beings are dogs. Which conclusion(s) logically follow?', '["Only I follows","Only II follows","Both follow","Neither follows"]'::jsonb, 0, 'Since all dogs are animals and all animals are living beings, all dogs must be living beings (I follows). Conclusion II reverses the relationship and does not follow.', 'easy'),
  ('Statements: Some teachers are students. All students are readers. Conclusion: Some teachers are readers. Does the conclusion logically follow?', '["Follows","Does not follow","Cannot be determined","Follows only if all teachers are students"]'::jsonb, 0, 'Since some teachers are students, and all students are readers, those same teachers must be readers, so the conclusion follows.', 'medium'),
  ('Statements: No cats are dogs. All dogs are animals. Conclusion: No cats are animals. Does the conclusion logically follow?', '["Follows","Does not follow","Follows partially","Cannot be determined"]'::jsonb, 1, 'The statements only tell us cats are not dogs, not that cats cannot be animals through some other overlap. The conclusion does not necessarily follow.', 'medium'),
  ('Statements: All pens are pencils. Some pencils are erasers. Conclusion: Some pens are erasers. Does the conclusion logically follow?', '["Follows","Does not follow","Cannot be determined","Definitely true"]'::jsonb, 1, 'The pencils that are erasers may be entirely different from the pencils that are pens, so the conclusion does not necessarily follow.', 'medium'),
  ('Statements: All squares are rectangles. All rectangles are quadrilaterals. Conclusions: I. All squares are quadrilaterals. II. Some quadrilaterals are squares. Which conclusion(s) follow?', '["Only I follows","Only II follows","Both follow","Neither follows"]'::jsonb, 2, 'I follows directly by the chain of "all" statements. II also follows, since if all squares are quadrilaterals and squares exist, then at least some quadrilaterals are squares.', 'hard'),
  ('Statements: All birds can fly. Penguins are birds. Conclusion: Penguins can fly. Based only on the given statements (regardless of real-world fact), does the conclusion logically follow?', '["Follows","Does not follow","Cannot be determined","Only sometimes"]'::jsonb, 0, 'Syllogism validity is judged purely by the logical structure of the given statements, not by outside knowledge. Since all birds can fly and penguins are birds, the conclusion follows from the statements as given.', 'easy'),
  ('Statements: Some boys are tall. All tall people are athletic. Conclusion: Some boys are athletic. Does the conclusion logically follow?', '["Follows","Does not follow","Cannot be determined","False"]'::jsonb, 0, 'The boys who are tall must also be athletic, since all tall people are athletic, so the conclusion follows.', 'medium'),
  ('Statements: All coins are round. No round object is square. Conclusion: No coin is square. Does the conclusion logically follow?', '["Follows","Does not follow","Cannot be determined","Only partially"]'::jsonb, 0, 'Since all coins are round, and no round object is square, no coin can be square, so the conclusion follows.', 'medium'),
  ('Statements: Some pens are red. Some red things are costly. Conclusion: Some pens are costly. Does the conclusion logically follow?', '["Follows","Does not follow","Cannot be determined","Always true"]'::jsonb, 1, 'Two "some" statements cannot be validly combined this way, since the red things that are costly may not overlap with the red things that are pens. The conclusion does not necessarily follow.', 'hard'),
  ('Statements: All doctors are educated. Some educated people are rich. Conclusions: I. Some doctors are rich. II. Some rich people are educated. Which conclusion(s) follow?', '["Only I follows","Only II follows","Both follow","Neither follows"]'::jsonb, 1, 'Conclusion I does not necessarily follow, since the rich educated people may not be doctors. Conclusion II follows because "some educated people are rich" can be validly converted to "some rich people are educated."', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'logical' and tpc.name = 'Syllogisms'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- VERBAL: Synonyms ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'verbal', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Choose the word most similar in meaning to "Happy".', '["Joyful","Sad","Angry","Tired"]'::jsonb, 0, '"Joyful" means feeling or expressing great happiness, making it the closest synonym.', 'easy'),
  ('Choose the word most similar in meaning to "Big".', '["Huge","Tiny","Small","Narrow"]'::jsonb, 0, '"Huge" means very large in size, making it the closest synonym of "Big".', 'easy'),
  ('Choose the word most similar in meaning to "Benevolent".', '["Kind","Cruel","Selfish","Greedy"]'::jsonb, 0, '"Benevolent" means kind and generous, so "Kind" is the closest synonym.', 'medium'),
  ('Choose the word most similar in meaning to "Candid".', '["Frank","Secretive","Confused","Shy"]'::jsonb, 0, '"Candid" means open and honest, so "Frank" is the closest synonym.', 'medium'),
  ('Choose the word most similar in meaning to "Meticulous".', '["Careful","Careless","Lazy","Hasty"]'::jsonb, 0, '"Meticulous" means showing great attention to detail, so "Careful" is the closest synonym.', 'medium'),
  ('Choose the word most similar in meaning to "Ephemeral".', '["Fleeting","Eternal","Solid","Ancient"]'::jsonb, 0, '"Ephemeral" means lasting for a very short time, so "Fleeting" is the closest synonym.', 'hard'),
  ('Choose the word most similar in meaning to "Ubiquitous".', '["Omnipresent","Rare","Hidden","Local"]'::jsonb, 0, '"Ubiquitous" means found everywhere, so "Omnipresent" is the closest synonym.', 'hard'),
  ('Choose the word most similar in meaning to "Diligent".', '["Hardworking","Idle","Reckless","Sloppy"]'::jsonb, 0, '"Diligent" means showing care and effort in work, so "Hardworking" is the closest synonym.', 'medium'),
  ('Choose the word most similar in meaning to "Brave".', '["Courageous","Cowardly","Weak","Timid"]'::jsonb, 0, '"Courageous" means showing bravery, so it is the closest synonym of "Brave".', 'easy'),
  ('Choose the word most similar in meaning to "Pragmatic".', '["Practical","Idealistic","Emotional","Theoretical"]'::jsonb, 0, '"Pragmatic" means dealing with things sensibly and realistically, so "Practical" is the closest synonym.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'verbal' and tpc.name = 'Synonyms'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- VERBAL: Antonyms ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'verbal', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Choose the word most opposite in meaning to "Happy".', '["Sad","Joyful","Glad","Content"]'::jsonb, 0, '"Sad" is the direct opposite of "Happy".', 'easy'),
  ('Choose the word most opposite in meaning to "Ancient".', '["Modern","Old","Historic","Aged"]'::jsonb, 0, '"Modern" means belonging to the present time, the opposite of "Ancient".', 'easy'),
  ('Choose the word most opposite in meaning to "Generous".', '["Stingy","Kind","Giving","Charitable"]'::jsonb, 0, '"Stingy" means unwilling to give, the opposite of "Generous".', 'medium'),
  ('Choose the word most opposite in meaning to "Optimistic".', '["Pessimistic","Hopeful","Cheerful","Positive"]'::jsonb, 0, '"Pessimistic" means expecting the worst, the opposite of "Optimistic".', 'medium'),
  ('Choose the word most opposite in meaning to "Abundant".', '["Scarce","Plentiful","Rich","Ample"]'::jsonb, 0, '"Scarce" means insufficient in supply, the opposite of "Abundant".', 'medium'),
  ('Choose the word most opposite in meaning to "Candid".', '["Deceptive","Honest","Frank","Open"]'::jsonb, 0, '"Deceptive" means misleading, the opposite of "Candid" (open and honest).', 'hard'),
  ('Choose the word most opposite in meaning to "Meticulous".', '["Careless","Careful","Thorough","Precise"]'::jsonb, 0, '"Careless" means lacking attention to detail, the opposite of "Meticulous".', 'hard'),
  ('Choose the word most opposite in meaning to "Diligent".', '["Lazy","Hardworking","Sincere","Devoted"]'::jsonb, 0, '"Lazy" means unwilling to work or make an effort, the opposite of "Diligent".', 'medium'),
  ('Choose the word most opposite in meaning to "Brave".', '["Cowardly","Bold","Fearless","Courageous"]'::jsonb, 0, '"Cowardly" means lacking courage, the opposite of "Brave".', 'easy'),
  ('Choose the word most opposite in meaning to "Benevolent".', '["Malevolent","Kind","Generous","Charitable"]'::jsonb, 0, '"Malevolent" means having ill will towards others, the opposite of "Benevolent" (kind and generous).', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'verbal' and tpc.name = 'Antonyms'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- VERBAL: One-word Substitution ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'verbal', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('A person who studies birds is called a(n):', '["Ornithologist","Astrologer","Geologist","Botanist"]'::jsonb, 0, 'An "Ornithologist" is a scientist who studies birds.', 'easy'),
  ('A person who can speak many languages is called a(n):', '["Polyglot","Linguist","Bilingual","Translator"]'::jsonb, 0, 'A "Polyglot" is a person who knows and can use several languages.', 'easy'),
  ('A place where coins are manufactured is called a:', '["Mint","Foundry","Factory","Treasury"]'::jsonb, 0, 'A "Mint" is a place where coins are officially produced.', 'medium'),
  ('A person who is not easily discouraged or defeated is called:', '["Indomitable","Timid","Fragile","Docile"]'::jsonb, 0, '"Indomitable" describes someone who cannot be overcome or discouraged.', 'medium'),
  ('A person who leaves their own country to settle in another is called a(n):', '["Emigrant","Immigrant","Tourist","Refugee"]'::jsonb, 0, 'An "Emigrant" is a person who leaves their own country to live elsewhere, viewed from the perspective of the country they are leaving.', 'medium'),
  ('A statement that can be understood in only one way is called:', '["Unambiguous","Ambiguous","Vague","Cryptic"]'::jsonb, 0, '"Unambiguous" describes something that has only one clear interpretation.', 'hard'),
  ('A person who works without being paid is called a:', '["Volunteer","Mercenary","Employee","Contractor"]'::jsonb, 0, 'A "Volunteer" is a person who offers to do work without expecting payment.', 'hard'),
  ('A person aged between 80 and 90 years is called a(n):', '["Octogenarian","Nonagenarian","Centenarian","Septuagenarian"]'::jsonb, 0, 'An "Octogenarian" is a person in their eighties (80-89 years old).', 'medium'),
  ('Government by the wealthy class is called:', '["Plutocracy","Democracy","Autocracy","Theocracy"]'::jsonb, 0, 'A "Plutocracy" is a system of government controlled by the wealthy.', 'medium'),
  ('A word that reads the same backward as forward is called a:', '["Palindrome","Acronym","Anagram","Homonym"]'::jsonb, 0, 'A "Palindrome" is a word or phrase that reads the same in both directions, such as "level".', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'verbal' and tpc.name = 'One-word Substitution'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- VERBAL: Fill in the Blanks ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'verbal', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('She ___ to the market every day.', '["goes","go","going","gone"]'::jsonb, 0, 'The subject "She" (third person singular) requires the verb form "goes" in the simple present tense.', 'easy'),
  ('They ___ playing football when it started to rain.', '["were","was","is","are"]'::jsonb, 0, 'The plural subject "They" combined with the past continuous tense requires "were".', 'easy'),
  ('He is ___ honest man.', '["an","a","the","-- (no article)"]'::jsonb, 0, '"Honest" begins with a vowel sound (silent h), so it takes the article "an".', 'medium'),
  ('Neither the manager nor the employees ___ satisfied with the decision.', '["were","was","is","being"]'::jsonb, 0, 'In an "either/or" or "neither/nor" construction, the verb agrees with the subject closer to it, which here is the plural "employees", requiring "were".', 'medium'),
  ('She has been working here ___ 2015.', '["since","for","from","at"]'::jsonb, 0, '"Since" is used with a specific point in time (like a year), while "for" is used with a duration.', 'medium'),
  ('Had I known about the meeting, I ___ attended it.', '["would have","will have","would","had"]'::jsonb, 0, 'This is a third conditional sentence describing an unreal past situation, which requires "would have" in the main clause.', 'hard'),
  ('The committee ___ yet to announce the results.', '["is","are","were","have"]'::jsonb, 0, '"Committee" is treated as a singular collective noun here, requiring "is".', 'medium'),
  ('No sooner ___ the bell rung than the students rushed out.', '["had","did","has","was"]'::jsonb, 0, 'The idiom "no sooner... than" is used with the past perfect tense, requiring "had".', 'hard'),
  ('One should always be true ___ one''s own conscience.', '["to","with","for","at"]'::jsonb, 0, 'The idiomatic phrase is "true to", meaning faithful or loyal to something.', 'medium'),
  ('It is high time we ___ our habits.', '["changed","change","changing","will change"]'::jsonb, 0, 'The idiom "it is high time" is followed by the simple past tense, even though the meaning is present or future.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'verbal' and tpc.name = 'Fill in the Blanks'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- VERBAL: Sentence Correction ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'verbal', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Choose the grammatically correct sentence.', '["She don''t like coffee.","She doesn''t likes coffee.","She doesn''t like coffee.","She not like coffee."]'::jsonb, 2, 'With the third person singular subject "She", the correct negative form uses "doesn''t" followed by the base verb "like".', 'easy'),
  ('Choose the grammatically correct sentence.', '["He is going to school since morning.","He has been going to school since morning.","He go to school since morning.","He going to school since morning."]'::jsonb, 1, 'An action that started in the past and continues to the present, especially with "since", requires the present perfect continuous tense: "has been going".', 'easy'),
  ('Choose the grammatically correct sentence.', '["Each of the students have submitted their assignment.","Each of the students has submitted their assignment.","Each of the students has submitted his assignment.","Each of the student has submitted their assignment."]'::jsonb, 2, '"Each" is singular and takes a singular verb ("has") and, in traditional formal grammar, a singular pronoun ("his").', 'medium'),
  ('Choose the grammatically correct sentence.', '["The number of accidents have increased.","The number of accidents has increased.","The numbers of accident has increased.","The number of accident have increased."]'::jsonb, 1, '"The number of" is treated as singular, so it takes the singular verb "has".', 'medium'),
  ('Choose the grammatically correct sentence.', '["Neither of the answers are correct.","Neither of the answers is correct.","Neither of the answer is correct.","Neither of the answers were correct."]'::jsonb, 1, '"Neither" is singular and takes the singular verb "is".', 'medium'),
  ('Choose the grammatically correct sentence.', '["He is one of the best player in the team.","He is one of the best players in the team.","He is one of best players in team.","He is one of the players best in the team."]'::jsonb, 1, 'The phrase "one of the best" must be followed by a plural noun, "players".', 'hard'),
  ('Choose the grammatically correct sentence.', '["I am agree with you.","I agree with you.","I am agreeing with you fully.","I do agree you."]'::jsonb, 1, '"Agree" is a simple verb and should not be used with "am"; the correct form is simply "I agree with you".', 'hard'),
  ('Choose the grammatically correct sentence.', '["She is senior than me.","She is senior to me.","She is more senior than me.","She is senior from me."]'::jsonb, 1, 'The adjective "senior" is followed by "to", not "than", since it is a Latin-origin comparative.', 'medium'),
  ('Choose the grammatically correct sentence.', '["He asked that why I was late.","He asked why I was late.","He asked that why was I late.","He asked me why I was being late."]'::jsonb, 1, 'In reported speech, a question word like "why" introduces the clause directly, without "that", and the word order becomes statement order ("I was late"), not question order.', 'medium'),
  ('Choose the grammatically correct sentence.', '["Everyone should do their duty sincerely.","Everyone should do they duty sincerely.","Everyone should did their duty sincerely.","Everyone should does their duty sincerely."]'::jsonb, 0, '"Their" is the correct possessive pronoun to use with "everyone" in modern usage, and "do" is the correct base verb form after "should".', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'verbal' and tpc.name = 'Sentence Correction'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

-- ---------- VERBAL: Reading Comprehension ----------
insert into aptitude_questions (category, topic_id, topic, prompt, options, correct_option, explanation, difficulty)
select 'verbal', tpc.id, tpc.name, v.prompt, v.options, v.correct_option, v.explanation, v.difficulty::question_difficulty
from aptitude_topics tpc
join (values
  ('Passage: "Bees play a crucial role in pollinating flowering plants, which include many of the crops we depend on for food. Without pollinators like bees, the yield of fruits and vegetables would drop significantly." Question: According to the passage, why are bees important?', '["They pollinate flowering plants and crops","They produce honey for humans","They protect crops from pests","They help in soil formation"]'::jsonb, 0, 'The passage states that bees pollinate flowering plants, including food crops, and that this pollination affects crop yield.', 'easy'),
  ('Passage: "The library closes at 8 PM on weekdays and at 5 PM on weekends. Students preparing for exams often stay until closing time." Question: At what time does the library close on Saturdays?', '["8 PM","5 PM","6 PM","7 PM"]'::jsonb, 1, 'Saturday is a weekend day, and the passage states the library closes at 5 PM on weekends.', 'easy'),
  ('Passage: "Renewable energy sources such as solar and wind power do not deplete natural resources the way fossil fuels do. However, their availability can be inconsistent, depending on weather and time of day, which makes energy storage an important part of renewable energy systems." Question: What challenge of renewable energy does the passage mention?', '["High cost of installation","Inconsistent availability","Pollution during use","Difficulty in transportation"]'::jsonb, 1, 'The passage explicitly says the availability of renewable energy can be inconsistent, depending on weather and time of day.', 'medium'),
  ('Passage: "A balanced diet includes carbohydrates, proteins, fats, vitamins, and minerals in the right proportions. Consuming too much of any one nutrient, even a healthy one, can lead to health problems over time." Question: What does the passage suggest about healthy nutrients?', '["They can cause problems if consumed excessively","They should be avoided entirely","Only proteins are truly necessary","Vitamins are more important than minerals"]'::jsonb, 0, 'The passage states that consuming too much of any one nutrient, even a healthy one, can lead to health problems over time.', 'medium'),
  ('Passage: "The invention of the printing press in the 15th century dramatically increased the availability of books, making written knowledge accessible to a much wider population than before, and reducing the cost of producing each copy." Question: What was one major effect of the printing press?', '["It made books more available and affordable","It made books more expensive","It reduced the number of readers","It replaced the need for handwriting entirely"]'::jsonb, 0, 'The passage states the printing press increased the availability of books and reduced the cost of producing each copy.', 'medium'),
  ('Passage: "Although automation increases efficiency in manufacturing, it can also displace workers whose tasks are replaced by machines. Economists debate whether the new jobs created by automation adequately offset the jobs lost, particularly in the short term." Question: According to the passage, what is a point of debate among economists?', '["Whether automation is legal","Whether new jobs offset job losses from automation","Whether machines are more efficient than humans","Whether automation should be banned"]'::jsonb, 1, 'The passage says economists debate whether the new jobs created by automation adequately offset the jobs lost.', 'hard'),
  ('Passage: "Migratory birds travel thousands of kilometers each year between breeding and feeding grounds. Scientists believe they navigate using a combination of the sun''s position, the earth''s magnetic field, and familiar landmarks." Question: How do scientists believe migratory birds navigate?', '["Using only the sun''s position","Using sun position, magnetic field, and landmarks together","Using GPS-like organs","By following other bird species only"]'::jsonb, 1, 'The passage states birds are believed to navigate using a combination of the sun''s position, the earth''s magnetic field, and familiar landmarks.', 'medium'),
  ('Passage: "Inflation refers to a general increase in prices and a fall in the purchasing value of money. While moderate inflation is considered a normal part of a growing economy, hyperinflation can severely destabilize a country''s financial system." Question: What does the passage say about moderate inflation?', '["It is abnormal and harmful","It is considered normal in a growing economy","It always leads to hyperinflation","It has no effect on purchasing power"]'::jsonb, 1, 'The passage explicitly states that moderate inflation is considered a normal part of a growing economy.', 'hard'),
  ('Passage: "Regular physical exercise has been shown to improve not only physical health but also mental well-being, by reducing stress hormones and releasing chemicals in the brain associated with improved mood." Question: According to the passage, exercise benefits mental health by:', '["Increasing stress hormones","Reducing stress hormones and boosting mood-related brain chemicals","Only improving physical strength","Eliminating the need for sleep"]'::jsonb, 1, 'The passage states exercise improves mental well-being by reducing stress hormones and releasing mood-related brain chemicals.', 'medium'),
  ('Passage: "Urban planning that prioritizes public transportation and walkable neighborhoods tends to reduce traffic congestion and lower carbon emissions compared to car-dependent city designs. However, implementing such changes in already-built cities often requires significant investment and time." Question: What is one obstacle to changing car-dependent cities, according to the passage?', '["Lack of public interest","Significant investment and time required","Legal restrictions on public transport","Absence of walkable technology"]'::jsonb, 1, 'The passage states that implementing such changes in already-built cities often requires significant investment and time.', 'hard')
) as v(prompt, options, correct_option, explanation, difficulty) on true
where tpc.category = 'verbal' and tpc.name = 'Reading Comprehension'
and not exists (
  select 1 from aptitude_questions aq where aq.topic_id = tpc.id and aq.prompt = v.prompt
);

